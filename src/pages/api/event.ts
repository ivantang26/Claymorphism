import type { APIRoute } from "astro";
import { count, EVENTS } from "~/lib/metrics";
import { json } from "~/lib/http";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { name?: unknown; path?: unknown; props?: unknown } = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ ok: false }, 400);
  }
  if (typeof body.name !== "string" || !EVENTS.has(body.name)) return json({ ok: false }, 400);
  // trial_started and demo_booked are counted by their own endpoints, server side
  if (body.name === "trial_started" || body.name === "demo_booked") return json({ ok: true });
  const props = body.props && typeof body.props === "object" ? (body.props as Record<string, string>) : {};
  await count(body.name, typeof body.path === "string" ? body.path : "/", props);
  return new Response(null, { status: 204 });
};
