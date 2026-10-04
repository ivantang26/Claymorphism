// Page weight budgets (spec section 8), measured the way a phone loads them:
//   Home: under 1.5MB   Demo game: under 2MB including audio
// Counts HTML, CSS, fonts, every script in the module graph (static and dynamic
// imports), images at the phone-sized srcset candidate, and audio for the game.
// Text assets are counted gzipped, as they travel over the network.

import { readFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const CLIENT = path.resolve(import.meta.dirname, "../dist/client");
const BUDGETS = [
  { page: "index.html", label: "Home", limit: 1.5 * 1024 * 1024, audio: false },
  { page: "play.html", label: "Demo game", limit: 2 * 1024 * 1024, audio: true },
];

const isText = (f) => /\.(html|css|js|mjs|json|svg)$/.test(f);
const size = (f) => (isText(f) ? gzipSync(readFileSync(f)).length : statSync(f).size);
const local = (url, from) => {
  if (/^(data:|https?:|\/\/|#|mailto:)/.test(url)) return null;
  const p = url.startsWith("/") ? path.join(CLIENT, url) : path.resolve(path.dirname(from), url);
  return existsSync(p.split(/[?#]/)[0]) ? p.split(/[?#]/)[0] : null;
};

function collect(page, withAudio) {
  const route = page === "index.html" ? "" : page.slice(0, -".html".length);
  const html = [
    path.join(CLIENT, page),
    path.join(CLIENT, route, "index.html"),
  ].find(existsSync);
  if (!html) throw new Error(`Could not find built page for ${page} in ${CLIENT}`);
  const seen = new Map();
  const add = (f, kind) => f && !seen.has(f) && seen.set(f, kind);
  const text = readFileSync(html, "utf8");
  add(html, "html");

  // images: the smallest srcset candidate is what a phone picks
  for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcset = tag.match(/srcset=["']([^"']+)/)?.[1];
    const src = srcset ? srcset.split(",")[0].trim().split(/\s+/)[0] : tag.match(/\ssrc=["']([^"']+)/)?.[1];
    if (src) add(local(src, html), "image");
  }
  for (const m of text.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    if (/rel=["']?(stylesheet|modulepreload|preload|icon)/.test(m[0])) add(local(m[1], html), /stylesheet/.test(m[0]) ? "css" : "asset");
  }
  const scripts = [
    ...[...text.matchAll(/<script\b[^>]*src=["']([^"']+)/gi)].map((m) => m[1]),
    ...[...text.matchAll(/(?:component-url|renderer-url|before-hydration-url)=["']([^"']+)/gi)].map((m) => m[1]),
    ...[...text.matchAll(/import\s*\(?\s*["'](\/_astro\/[^"']+)["']/g)].map((m) => m[1]),
  ];
  const queue = scripts.map((s) => local(s, html)).filter(Boolean);
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    add(f, "js");
    const js = readFileSync(f, "utf8");
    for (const m of js.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      const dep = local(m[1], f);
      if (dep && !seen.has(dep)) queue.push(dep);
    }
    // assets referenced from JS (images used by islands)
    for (const m of js.matchAll(/["'](\/art\/[^"']+\.(?:webp|png))["']/g)) {
      if (/-640\.webp$/.test(m[1])) continue; // phones take the 320 variant
      add(local(m[1], f), "image");
    }
  }
  for (const [f, kind] of [...seen]) {
    if (kind !== "css") continue;
    const css = readFileSync(f, "utf8");
    for (const m of css.matchAll(/url\(["']?([^"')]+\.woff2)/g)) add(local(m[1], f), "font");
  }
  if (withAudio) add(path.join(CLIENT, "audio/pip.webm"), "audio");
  return seen;
}

let failed = false;
for (const b of BUDGETS) {
  const files = collect(b.page, b.audio);
  const byKind = {};
  let total = 0;
  for (const [f, kind] of files) {
    const s = size(f);
    total += s;
    byKind[kind] = (byKind[kind] ?? 0) + s;
  }
  const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
  const ok = total <= b.limit;
  if (!ok) failed = true;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${b.label}: ${kb(total)} of ${kb(b.limit)}  (` +
      Object.entries(byKind)
        .map(([k, v]) => `${k} ${kb(v)}`)
        .join(", ") +
      `, ${files.size} files)`,
  );
}
if (failed) process.exit(1);
