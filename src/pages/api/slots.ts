import type { APIRoute } from "astro";
import { booking } from "~/lib/booking";
import { json } from "~/lib/http";

export const prerender = false;

export const GET: APIRoute = async () => {
  const days = await booking.availability(new Date(), 10);
  return json({ timezone: "Europe/London", days });
};
