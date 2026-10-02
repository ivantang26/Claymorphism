// Cookieless first-party analytics: daily counters only (server side).
// We never store IP addresses, user agents or any identifier.
import { locked, readJson, writeJson } from "./store";

export const EVENTS = new Set(["pageview", "game_start", "game_complete", "gate_passed", "trial_started", "demo_booked"]);
export type Counts = Record<string, Record<string, number>>; // day -> key -> n

export function count(name: string, path: string, props: Record<string, string> = {}) {
  const day = new Date().toISOString().slice(0, 10);
  const safePath = /^\/[a-z0-9\-/]*$/i.test(path) ? path.slice(0, 64) : "/";
  const detail = Object.entries(props)
    .filter(([k, v]) => /^[a-z_]{1,20}$/.test(k) && /^[a-z0-9_-]{1,20}$/i.test(v))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const key = `${name} ${safePath}${detail ? ` ${detail}` : ""}`;
  return locked(async () => {
    const counts = await readJson<Counts>("events.json", {});
    counts[day] ??= {};
    counts[day][key] = (counts[day][key] ?? 0) + 1;
    await writeJson("events.json", counts);
  });
}

