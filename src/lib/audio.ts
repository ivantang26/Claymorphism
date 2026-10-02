// Narration and sound effects for the demo game (FR-3), via Howler.
// Howler and the sprite only load after the child presses Play, which is also
// the user gesture browsers need before audio can start.

import sprite from "~/data/audio-sprite.json";
import type { Howl as HowlT } from "howler";

export type Clip = keyof typeof sprite;

let howl: HowlT | null = null;
let loading: Promise<HowlT | null> | null = null;
let muted = true;
let queue: Clip[] = [];
let playingId: number | null = null;
let voiceToken = 0;

export function load(): Promise<HowlT | null> {
  if (!loading) {
    loading = import("howler")
      .then(
        ({ Howl }) =>
          new Promise<HowlT | null>((resolve) => {
            const h = new Howl({
              src: ["/audio/pip.webm", "/audio/pip.mp3"],
              sprite: sprite as unknown as Record<string, [number, number]>,
              preload: true,
              mute: muted,
              onload: () => resolve(h),
              onloaderror: () => resolve(null),
            });
            howl = h;
          }),
      )
      .catch(() => null);
  }
  return loading;
}

export function setMuted(value: boolean) {
  muted = value;
  howl?.mute(value);
  if (value) stopVoice();
}

export const isMuted = () => muted;

/** Stop whatever Pip is saying and clear the queue. */
export function stopVoice() {
  voiceToken++;
  queue = [];
  if (howl && playingId !== null) howl.stop(playingId);
  playingId = null;
}

/** Say clips one after another, replacing anything already queued. */
export async function say(clips: Clip[]) {
  stopVoice();
  const token = voiceToken;
  const h = await load();
  if (!h || muted || token !== voiceToken) return;
  queue = clips.slice();
  const next = () => {
    if (token !== voiceToken) return;
    const clip = queue.shift();
    if (!clip) {
      playingId = null;
      return;
    }
    const id = h.play(clip);
    playingId = id;
    h.once("end", next, id);
  };
  next();
}

/** Fire-and-forget sound effect that plays over the voice. */
export async function sfx(clip: Clip) {
  const h = await load();
  if (!h || muted) return;
  h.play(clip);
}
