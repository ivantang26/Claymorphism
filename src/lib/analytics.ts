// First-party, cookieless analytics (FR-8).
// Sends an event name and page path to our own /api/event. No cookies, no
// identifiers, no user agent, no IP stored: counts only. Honours Do Not Track
// and Global Privacy Control.

export type EventName = "pageview" | "game_start" | "game_complete" | "gate_passed" | "trial_started" | "demo_booked";

export function track(name: EventName, props: Record<string, string> = {}) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
  const body = JSON.stringify({ name, path: location.pathname, props });
  try {
    if (!navigator.sendBeacon?.("/api/event", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/event", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true, credentials: "omit" });
    }
  } catch {
    /* analytics must never break the page */
  }
}
