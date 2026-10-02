// Build gate: every text colour on every surface meets its contrast target.
// Reads the real values from src/styles/tokens.css.
import { readFileSync } from "node:fs";
import { parseTokens, textPairs, ratio } from "../src/lib/contrast.js";

const tokens = parseTokens(readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8"));
let failed = 0;
for (const p of textPairs(tokens)) {
  if (!p.fgHex || !p.bgHex) {
    console.error(`  missing token for ${p.fg} on ${p.bg}`);
    failed++;
    continue;
  }
  const r = ratio(p.fgHex, p.bgHex);
  const ok = r >= p.min;
  if (!ok) failed++;
  console.log(`${ok ? "  pass" : "  FAIL"}  ${r.toFixed(2).padStart(5)}:1  (needs ${p.min}:1)  ${p.fg} on ${p.bg} [${p.mode}]`);
}
if (failed) {
  console.error(`\n${failed} contrast check(s) failed.`);
  process.exit(1);
}
console.log("\nAll text passes.");
