// Contact sheet of rendered art on the page cream, for reviewing renders.
// node scripts/clay/contact-sheet.mjs public/art out.png [filter]
import sharp from "sharp";
import { readdirSync } from "node:fs";
import path from "node:path";
const dir = process.argv[2], out = process.argv[3], filt = process.argv[4] || "-640";
const files = readdirSync(dir).filter((f) => f.includes(filt) || (filt==="-640" && f.endsWith("-256.webp")));
const cell = 320, cols = 4, rows = Math.ceil(files.length / cols);
const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(path.join(dir, f)).resize(cell, cell, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(), left: (i % cols) * cell, top: Math.floor(i / cols) * cell })));
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: "#FFF8F0" } }).composite(comps).png().toFile(out);
console.log(files.join(", "));
