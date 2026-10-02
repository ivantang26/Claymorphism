// Quick single render for tuning: node scripts/clay/debug.mjs out.png <kind> [args...] [--rot=x,y,z] [--half=n] [--cy=n]
import sharp from "sharp";
import { compileScene } from "./sdf.mjs";
import { renderScene } from "./render.mjs";
import * as S from "./scenes.mjs";
const [out, kind, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const args = rest.filter((a) => !a.startsWith("--"));
const def = kind === "mascot" ? S.mascots[args[0]](args[1]) : kind === "symbol" ? S.symbols[args[0]]() : S[kind](...args);
if (flags.rot) def.rot = flags.rot.split(",").map(Number);
if (flags.half) def.frame.half = +flags.half;
if (flags.cy) def.frame.cy = +flags.cy;
const width = 240, height = Math.round(240 * ((def.height ?? def.width) / def.width));
const raw = renderScene(compileScene(def.groups), { width, height, frame: def.frame, rot: def.rot, bump: def.bump, ss: 1 });
await sharp(raw, { raw: { width, height, channels: 4 } }).flatten({ background: "#FFF8F0" }).png().toFile(out);
