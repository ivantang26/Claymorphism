// Builds an .ics calendar invite for a booked demo (runs in the browser).
// Times are UK local; we declare TZID=Europe/London so calendars convert correctly.

// RFC 5545 text escaping: backslash, semicolon and comma get a backslash; newlines become \n
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function demoInvite({ id, start, minutes, school }: { id: string; start: string; minutes: number; school: string }) {
  const [date, time] = start.split("T");
  const [h, m] = time.split(":").map(Number);
  const endMin = h * 60 + m + minutes;
  const local = (hh: number, mm: number) => `${date.replace(/-/g, "")}T${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doodle Math//School demos//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@doodlemath.example`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=Europe/London:${local(h, m)}`,
    `DTEND;TZID=Europe/London:${local(Math.floor(endMin / 60), endMin % 60)}`,
    `SUMMARY:${esc("Doodle Math school demo")}`,
    `DESCRIPTION:${esc(`A 30 minute video walkthrough of Doodle Math for ${school}. Booking reference ${id}. We'll email the joining link the day before.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
