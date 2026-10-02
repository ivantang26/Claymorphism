// Renders every clay asset into public/art as WebP at two sizes.
//   node scripts/clay/render-all.mjs            render everything
//   node scripts/clay/render-all.mjs pip star   render jobs whose name contains a filter
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { cpus } from "node:os";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../public/art");

// name -> [sceneFactoryKey, args, output widths]
const JOBS = [];
for (const m of ["pip", "minty", "lulu", "skye"]) {
  JOBS.push({ name: `${m}-idle`, scene: ["mascot", m, "idle"], sizes: [640, 320] });
  JOBS.push({ name: `${m}-happy`, scene: ["mascot", m, "happy"], sizes: [640, 320] });
}
const ISLANDS = {
  peach: ["#FFD8C2", "#E9A07E", "#FFB38A"],
  mint: ["#C8F2E0", "#6FC7A6", "#8FE3C3"],
  lilac: ["#E3D9FF", "#A993EE", "#C7B3FF"],
  sky: ["#D3EBFF", "#7FB6E6", "#9ED4FF"],
};
for (const k of Object.keys(ISLANDS)) JOBS.push({ name: `island-${k}`, scene: ["island", ...ISLANDS[k]], sizes: [640, 320] });
JOBS.push({ name: "star", scene: ["star"], sizes: [256, 128] });
for (const s of ["plus", "minus", "times", "divide", "play", "levelup"]) JOBS.push({ name: `icon-${s}`, scene: ["symbol", s], sizes: [256, 128] });
JOBS.push({ name: "mark", scene: ["mark"], sizes: [128, 64], png: [180, 64] });

async function buildScene([kind, ...args]) {
  const s = await import("./scenes.mjs");
  if (kind === "mascot") return s.mascots[args[0]](args[1]);
  if (kind === "island") return s.island(...args);
  if (kind === "star") return s.star();
  if (kind === "symbol") return s.symbols[args[0]]();
  if (kind === "mark") return s.mark();
  throw new Error(`Unknown scene ${kind}`);
}

if (isMainThread) {
  mkdirSync(OUT, { recursive: true });
  const filters = process.argv.slice(2);
  const jobs = filters.length ? JOBS.filter((j) => filters.some((f) => j.name.includes(f))) : JOBS;
  const pool = Math.max(1, Math.min(cpus().length - 1, jobs.length));
  let next = 0;
  const started = Date.now();
  const run = () =>
    new Promise((resolve, reject) => {
      const loop = () => {
        if (next >= jobs.length) return resolve();
        const job = jobs[next++];
        const w = new Worker(fileURLToPath(import.meta.url), { workerData: { job, out: OUT } });
        w.once("message", (m) => console.log(`  ${m}`));
        w.once("error", reject);
        w.once("exit", loop);
      };
      loop();
    });
  console.log(`Rendering ${jobs.length} clay assets on ${pool} workers...`);
  await Promise.all(Array.from({ length: pool }, run));
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${path.relative(process.cwd(), OUT)}`);
} else {
  const { job, out } = workerData;
  const t0 = Date.now();
  const [{ compileScene }, { renderScene }, sharp] = await Promise.all([
    import("./sdf.mjs"),
    import("./render.mjs"),
    import("sharp").then((m) => m.default),
  ]);
  const def = await buildScene(job.scene);
  const width = def.width, height = def.height ?? def.width;
  const raw = renderScene(compileScene(def.groups), { width, height, frame: def.frame, rot: def.rot, bump: def.bump, ss: 3 });
  const img = () => sharp(raw, { raw: { width, height, channels: 4 } });
  for (const w of job.sizes) {
    await img().resize(w).webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(path.join(out, `${job.name}-${w}.webp`));
  }
  for (const w of job.png ?? []) {
    await img().resize(w).png({ compressionLevel: 9, palette: true }).toFile(path.join(out, `${job.name}-${w}.png`));
  }
  parentPort.postMessage(`${job.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
