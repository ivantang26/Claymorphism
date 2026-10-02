// School demo booking (FR-5).
// The page talks only to our own /api/slots and /api/demo-booking endpoints,
// so no booking widget or third-party script ever loads (FR-8). This module
// is the integration seam: `localProvider` generates a demo team calendar;
// a production provider (Cal.com, Microsoft Bookings, etc.) would implement
// the same two methods server-side with an API key.

import { locked, readJson, writeJson } from "./store";

export interface Slot {
  /** Local UK time, "YYYY-MM-DDTHH:mm" */
  start: string;
  minutes: number;
}

export interface Day {
  date: string; // YYYY-MM-DD
  slots: Slot[];
}

export interface BookingProvider {
  availability(from: Date, days: number): Promise<Day[]>;
  book(slot: string, details: object): Promise<{ ok: true; id: string } | { ok: false; reason: "taken" | "invalid" }>;
}

const TIMES = ["09:00", "09:30", "10:30", "11:00", "13:30", "14:00", "15:30", "16:00"];
const MINUTES = 30;

/** Today's date in the UK, as YYYY-MM-DD. */
function ukDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Deterministic "busy" pattern so the calendar looks lived-in without randomness.
function busy(date: string, time: string) {
  let h = 0;
  for (const c of date + time) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5 === 0;
}

type Booked = Record<string, { id: string; at: string }>;

export const localProvider: BookingProvider = {
  async availability(from, days) {
    const booked = await readJson<Booked>("bookings.json", {});
    const out: Day[] = [];
    let date = addDays(ukDate(from), 1); // earliest is tomorrow
    while (out.length < days) {
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (dow !== 0 && dow !== 6) {
        out.push({
          date,
          slots: TIMES.filter((t) => !busy(date, t) && !booked[`${date}T${t}`]).map((t) => ({ start: `${date}T${t}`, minutes: MINUTES })),
        });
      }
      date = addDays(date, 1);
    }
    return out;
  },

  book(slot, details) {
    return locked(async () => {
      const [date, time] = slot.split("T");
      const tomorrow = addDays(ukDate(new Date()), 1);
      if (!TIMES.includes(time) || date < tomorrow || busy(date, time)) return { ok: false as const, reason: "invalid" as const };
      const booked = await readJson<Booked>("bookings.json", {});
      if (booked[slot]) return { ok: false as const, reason: "taken" as const };
      const id = `DM-${Date.now().toString(36).toUpperCase()}`;
      booked[slot] = { id, at: new Date().toISOString() };
      await writeJson("bookings.json", booked);
      void details;
      return { ok: true as const, id };
    });
  },
};

export const booking: BookingProvider = localProvider;
