import type { APIRoute } from "astro";
import { booking } from "~/lib/booking";
import { parseDemo, hasErrors } from "~/lib/validation";
import { append } from "~/lib/store";
import { json, readBody, sameOrigin } from "~/lib/http";
import { count } from "~/lib/metrics";

export const prerender = false;

// FR-5: school name, role, pupil count, preferred time.
export const POST: APIRoute = async ({ request, url }) => {
  if (!sameOrigin(request, url)) return json({ error: "Bad origin" }, 403);
  const { data, errors } = parseDemo(await readBody(request));
  if (hasErrors(errors)) return json({ errors }, 422);
  const result = await booking.book(data.slot, data);
  if (!result.ok) {
    const message =
      result.reason === "taken"
        ? "Someone just booked that time. Please pick another."
        : "That time isn't available. Please pick another.";
    return json({ errors: { slot: message } }, 409);
  }
  await append("demo-bookings.jsonl", { id: result.id, ...data, createdAt: new Date().toISOString() });
  await count("demo_booked", "/schools");
  return json({ ok: true, id: result.id, slot: data.slot, minutes: 30 });
};
