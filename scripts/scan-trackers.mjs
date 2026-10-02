// FR-8 automated scan: no third-party trackers, no cookies.
//
// 1. Static: every file in dist/client is checked for resources loaded from
//    another origin, known tracker domains, cookie writes and client storage.
//    Every HTML page must carry a same-origin Content-Security-Policy.
// 2. Runtime: boots the built server, requests every page and the GET API,
//    and fails if any response sets a cookie.
//
// Exit code 1 on any finding, so it can gate CI.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLIENT = path.join(ROOT, "dist/client");
const SERVER_ENTRY = path.join(ROOT, "dist/server/entry.mjs");

const TRACKERS = [
  "google-analytics.com", "googletagmanager.com", "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "facebook.net", "facebook.com/tr", "connect.facebook", "hotjar", "segment.io", "segment.com", "mixpanel", "amplitude",
  "fullstory", "clarity.ms", "newrelic", "nr-data.net", "sentry.io", "intercom", "hs-scripts", "hubspot", "tiktok",
  "snap.licdn", "ads-twitter", "static.ads", "adservice", "criteo", "taboola", "outbrain", "quantserve", "scorecardresearch",
  "cloudflareinsights", "fonts.googleapis.com", "fonts.gstatic.com", "youtube.com/embed", "player.vimeo",
  "calendly.com", "cal.com/embed",
];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const findings = [];
const note = (file, msg) => findings.push(`${path.relative(ROOT, file)}: ${msg}`);

if (!existsSync(CLIENT)) {
  console.error("dist/client not found. Run `astro build` first.");
  process.exit(1);
}

const files = walk(CLIENT).filter((f) => /\.(html|js|mjs|css|json|svg|webmanifest)$/.test(f));
const externalLinks = new Set();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lower = text.toLowerCase();

  for (const t of TRACKERS) if (lower.includes(t)) note(file, `mentions tracker domain "${t}"`);

  if (/document\.cookie\s*=/.test(text)) note(file, "writes document.cookie");
  if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(text)) note(file, "uses client-side storage");

  if (file.endsWith(".html")) {
    // Resources: anything the browser fetches by itself
    const resources = [
      ...text.matchAll(/<(?:script|img|source|iframe|audio|video|embed)\b[^>]*?\s(?:src|srcset)=["']([^"']+)["']/gi),
      ...text.matchAll(/<link\b[^>]*?\shref=["']([^"']+)["'][^>]*>/gi),
    ];
    for (const m of resources) {
      const tag = m[0].slice(0, 12);
      if (/rel=["']?canonical/i.test(m[0])) continue; // not fetched
      for (const url of m[1].split(",").map((s) => s.trim().split(/\s+/)[0])) {
        if (/^(https?:)?\/\//i.test(url)) note(file, `loads a third-party resource ${url} (${tag}...)`);
      }
    }
    if (/<iframe/i.test(text)) note(file, "contains an iframe");

    // the policy itself contains single quotes, so match the double-quoted attribute
    const csp = text.match(/<meta[^>]+http-equiv="content-security-policy"[^>]*content="([^"]+)"/i);
    if (!csp) note(file, "has no Content-Security-Policy");
    else {
      const policy = csp[1];
      if (!/default-src 'self'/.test(policy)) note(file, "CSP default-src is not 'self'");
      if (/https?:\/\//.test(policy)) note(file, "CSP allows an external origin");
    }

    // Links out are allowed on the site (e.g. the ICO), but never from the game (FR-2)
    for (const m of text.matchAll(/<a\b[^>]*?\shref=["'](https?:\/\/[^"']+)["']/gi)) {
      externalLinks.add(`${path.relative(CLIENT, file)} -> ${m[1]}`);
      if (path.basename(file) === "play.html") note(file, `game page links straight out to ${m[1]} without the grown-up gate`);
    }
  } else if (/\.(js|mjs)$/.test(file)) {
    for (const m of text.matchAll(/["'`](https?:\/\/[a-z0-9.-]+[^"'`\s]*)["'`]/gi)) {
      const url = m[1];
      // XML namespaces and spec URLs are strings, not requests
      if (/w3\.org|svelte\.dev|astro\.build|github\.com|mozilla\.org|developer\.|localhost|example/i.test(url)) continue;
      if (/(fetch|sendBeacon|import|src|href|XMLHttpRequest|open)\s*\(?\s*$/i.test(text.slice(Math.max(0, m.index - 30), m.index))) {
        note(file, `script requests ${url}`);
      }
    }
  } else if (file.endsWith(".css")) {
    for (const m of text.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/gi)) note(file, `stylesheet loads ${m[1]}`);
    if (/@import\s+(url\()?["']?(https?:)?\/\//i.test(text)) note(file, "stylesheet imports a remote stylesheet");
  }
}

console.log(`Static scan: ${files.length} files checked.`);
if (externalLinks.size) console.log(`  Outbound links (allowed, not trackers):\n    ${[...externalLinks].join("\n    ")}`);

// ---------- runtime: no Set-Cookie anywhere ----------
async function runtime() {
  if (!existsSync(SERVER_ENTRY)) {
    console.log("Runtime scan skipped: no server build.");
    return;
  }
  const port = 4500 + Math.floor(Math.random() * 400);
  const env = { ...process.env, PORT: String(port), HOST: "127.0.0.1", DOODLE_DATA_DIR: path.join(ROOT, "dist/.scan-data") };
  const server = spawn(process.execPath, [SERVER_ENTRY], { env, stdio: "ignore" });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + "/");
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    const pages = walk(CLIENT)
      .filter((f) => f.endsWith(".html"))
      .map((f) => "/" + path.relative(CLIENT, f).replace(/\\/g, "/").replace(/(index)?\.html$/, "").replace(/\/$/, ""));
    const urls = [...new Set(pages), "/api/slots"];
    for (const u of urls) {
      const res = await fetch(base + u, { redirect: "manual" });
      const cookie = res.headers.get("set-cookie");
      if (cookie) findings.push(`${u}: response sets a cookie (${cookie.split(";")[0]})`);
      if (res.status >= 500) findings.push(`${u}: server error ${res.status}`);
    }
    // the analytics beacon must not set anything either
    const ev = await fetch(base + "/api/event", { method: "POST", body: JSON.stringify({ name: "pageview", path: "/" }), headers: { "content-type": "application/json" } });
    if (ev.headers.get("set-cookie")) findings.push("/api/event: response sets a cookie");
    console.log(`Runtime scan: ${urls.length + 1} responses checked for cookies.`);
  } finally {
    server.kill();
  }
}

await runtime();

if (findings.length) {
  console.error(`\nTracker scan FAILED with ${findings.length} finding(s):\n  ${findings.join("\n  ")}`);
  process.exit(1);
}
console.log("\nTracker scan passed: no third-party resources, trackers or cookies.");
