import type { APIRoute } from "astro";
import { readJson } from "~/lib/store";
import { json } from "~/lib/http";
import type { Counts } from "~/lib/metrics";

export const prerender = false;

// Success metrics (spec section 10), computed from the anonymous daily counters.
// Needs ?token= matching METRICS_TOKEN in production; open in `astro dev`.
export const GET: APIRoute = async ({ url }) => {
  const token = process.env.METRICS_TOKEN;
  if (!import.meta.env.DEV && (!token || url.searchParams.get("token") !== token)) {
    return new Response("Not found", { status: 404 });
  }
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const counts = await readJson<Counts>("events.json", {});

  const sum = (match: (key: string) => boolean) =>
    Object.entries(counts)
      .filter(([day]) => day >= since)
      .reduce((n, [, keys]) => n + Object.entries(keys).reduce((m, [k, v]) => m + (match(k) ? v : 0), 0), 0);

  const starts = sum((k) => k.startsWith("game_start "));
  const completes = sum((k) => k.startsWith("game_complete "));
  const trials = sum((k) => k.startsWith("trial_started "));
  const trialsFromGame = sum((k) => k.startsWith("trial_started ") && k.includes("source=game"));
  const demos = sum((k) => k.startsWith("demo_booked "));
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

  return json({
    window: { days, since },
    familyTrialsStarted: { value: trials, target: 10_000 },
    schoolDemosBooked: { value: demos, target: 300 },
    demoGameCompletion: { value: pct(completes, starts), unit: "% of starts", target: 65 },
    signupFromGameEnd: { value: pct(trialsFromGame, completes), unit: "% of completions", target: 12 },
  });
};
