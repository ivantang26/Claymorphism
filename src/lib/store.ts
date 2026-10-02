// Tiny first-party file store for the demo backend (server only).
// Swap for a real database in production; the API routes only use these helpers.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(process.env.DOODLE_DATA_DIR ?? "data");

async function ensure() {
  await mkdir(DIR, { recursive: true });
}

export async function append(file: string, record: object) {
  await ensure();
  await appendFile(path.join(DIR, file), JSON.stringify(record) + "\n", "utf8");
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, value: unknown) {
  await ensure();
  await writeFile(path.join(DIR, file), JSON.stringify(value, null, 2), "utf8");
}

// Serialise read-modify-write updates within this process.
let queue: Promise<unknown> = Promise.resolve();
export function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}
