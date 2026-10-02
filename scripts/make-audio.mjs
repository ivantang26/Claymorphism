// Builds the demo game's audio sprite: Pip's narration plus sound effects.
//
// Narration is a placeholder recorded with the Windows speech engine (SAPI).
// The spec leaves "voice actors or approved synthetic voices" open, so the
// pipeline is the point: swap the WAVs in scripts/audio/voice/ for studio
// recordings with the same names and re-run this script.
//
// Output: public/audio/pip.webm (Opus) + pip.mp3 and src/data/audio-sprite.json
//   node scripts/make-audio.mjs            re-record with SAPI, then pack
//   node scripts/make-audio.mjs --pack     pack existing WAVs only (for studio takes)

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const VOICE = path.join(ROOT, "scripts/audio/voice");
const OUT = path.join(ROOT, "public/audio");
const RATE = 22050;

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

export const LINES = {
  intro: "Hi! I'm Pip. Let's add some numbers together!",
  what: "What is",
  plus: "plus",
  ...Object.fromEntries(NUMBERS.map((w, i) => [`n${i}`, w])),
  praise1: "Yes! Well done!",
  praise2: "Brilliant!",
  praise3: "You got it!",
  praise4: "Super adding!",
  nudge1: "Nearly! Have another go.",
  nudge2: "Good try! Let's count again.",
  nudge3: "Ooh, so close. Try once more.",
  easier: "Let's try a smaller one.",
  dots: "Count the dots with me.",
  end: "You did it! Eight stars! You're a super adder!",
  grownup: "This bit is for grown-ups. Ask a grown-up to help.",
};

// ---------- 1. record narration ----------
function record() {
  mkdirSync(VOICE, { recursive: true });
  const ps = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo " + RATE + ", ([System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen), ([System.Speech.AudioFormat.AudioChannel]::Mono)",
    "$s.Rate = -1",
  ];
  for (const [key, text] of Object.entries(LINES)) {
    const file = path.join(VOICE, `${key}.wav`).replace(/'/g, "''");
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><prosody pitch='+18%'>${text.replace(/'/g, "&apos;")}</prosody></speak>`;
    ps.push(`$s.SetOutputToWaveFile('${file}', $fmt)`, `$s.SpeakSsml("${ssml}")`);
  }
  ps.push("$s.SetOutputToNull()", "$s.Dispose()");
  const script = path.join(VOICE, "_record.ps1");
  writeFileSync(script, ps.join("\n"));
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { stdio: "inherit" });
}

// ---------- 2. WAV helpers ----------
function readWav(file) {
  const b = readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o < b.length) {
    const id = b.toString("ascii", o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === "fmt ") fmt = { rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22), ch: b.readUInt16LE(o + 10) };
    if (id === "data") data = b.subarray(o + 8, o + 8 + size);
    o += 8 + size + (size % 2);
  }
  if (!fmt || fmt.bits !== 16 || fmt.ch !== 1 || fmt.rate !== RATE) throw new Error(`${file}: need 16-bit mono ${RATE}Hz`);
  const s = new Float32Array(data.length / 2);
  for (let i = 0; i < s.length; i++) s[i] = data.readInt16LE(i * 2) / 32768;
  return s;
}

function trim(s, thr = 0.012) {
  let a = 0, b = s.length - 1;
  while (a < b && Math.abs(s[a]) < thr) a++;
  while (b > a && Math.abs(s[b]) < thr) b--;
  const pad = Math.round(RATE * 0.02);
  return s.subarray(Math.max(0, a - pad), Math.min(s.length, b + pad));
}

function writeWav(file, s) {
  const b = Buffer.alloc(44 + s.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + s.length * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(s.length * 2, 40);
  for (let i = 0; i < s.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(s[i] * 32767))), 44 + i * 2);
  writeFileSync(file, b);
}

// ---------- 3. synthesised sound effects (soft, never harsh) ----------
function tone(notes, { dur, gap, vol = 0.32, shape = "bell" }) {
  const total = Math.round(RATE * (gap * (notes.length - 1) + dur + 0.05));
  const s = new Float32Array(total);
  notes.forEach((f, n) => {
    const start = Math.round(RATE * gap * n);
    for (let i = 0; i < RATE * dur && start + i < total; i++) {
      const t = i / RATE;
      const env = shape === "bell" ? Math.min(1, t / 0.006) * Math.exp(-t * 7) : Math.sin(Math.PI * Math.min(1, t / dur));
      const v = Math.sin(2 * Math.PI * f * t) * 0.8 + Math.sin(2 * Math.PI * f * 2 * t) * 0.15 * Math.exp(-t * 12);
      s[start + i] += v * env * vol;
    }
  });
  return s;
}

function wobble() {
  const dur = 0.42, s = new Float32Array(Math.round(RATE * dur));
  let ph = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const f = 330 - 110 * (t / dur) + 18 * Math.sin(2 * Math.PI * 9 * t);
    ph += (2 * Math.PI * f) / RATE;
    s[i] = Math.sin(ph) * Math.sin(Math.PI * (t / dur)) * 0.22;
  }
  return s;
}

function pop() {
  const dur = 0.09, s = new Float32Array(Math.round(RATE * dur));
  let ph = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    ph += (2 * Math.PI * (900 - 5000 * t)) / RATE;
    s[i] = Math.sin(ph) * Math.exp(-t * 45) * 0.3;
  }
  return s;
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568;
const SFX = {
  "sfx-correct": () => tone([C5, E5, G5, C6], { dur: 0.5, gap: 0.075 }),
  "sfx-wobble": wobble,
  "sfx-celebrate": () => {
    const a = tone([C5, E5, G5, C6, E6, G6, C6, G6], { dur: 0.7, gap: 0.09, vol: 0.26 });
    const b = tone([C6, E6, G6], { dur: 1.1, gap: 0, vol: 0.14 });
    const out = new Float32Array(a.length + Math.round(RATE * 0.3));
    out.set(a);
    const off = Math.round(RATE * 0.72);
    for (let i = 0; i < b.length && off + i < out.length; i++) out[off + i] += b[i];
    return out;
  },
  "sfx-pop": pop,
};

// ---------- 4. pack into a sprite ----------
function pack() {
  const clips = [];
  for (const key of Object.keys(LINES)) {
    const f = path.join(VOICE, `${key}.wav`);
    if (!existsSync(f)) throw new Error(`Missing ${f}. Run without --pack to record.`);
    clips.push([key, trim(readWav(f))]);
  }
  for (const [key, fn] of Object.entries(SFX)) clips.push([key, fn()]);

  const gap = Math.round(RATE * 0.12);
  const total = clips.reduce((n, [, s]) => n + s.length + gap, 0);
  const all = new Float32Array(total);
  const sprite = {};
  let o = 0;
  for (const [key, s] of clips) {
    all.set(s, o);
    sprite[key] = [Math.round((o / RATE) * 1000), Math.round((s.length / RATE) * 1000)];
    o += s.length + gap;
  }
  mkdirSync(OUT, { recursive: true });
  const tmp = path.join(VOICE, "_sprite.wav");
  writeWav(tmp, all);
  const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, ...args], { stdio: "inherit" });
  ff(["-c:a", "libopus", "-b:a", "28k", "-ac", "1", path.join(OUT, "pip.webm")]);
  ff(["-c:a", "libmp3lame", "-b:a", "40k", "-ac", "1", "-ar", String(RATE), path.join(OUT, "pip.mp3")]);
  writeFileSync(path.join(ROOT, "src/data/audio-sprite.json"), JSON.stringify(sprite, null, 2) + "\n");
  const secs = (total / RATE).toFixed(1);
  console.log(`Packed ${clips.length} clips, ${secs}s of audio -> public/audio/pip.{webm,mp3}`);
}

if (!process.argv.includes("--pack")) record();
pack();
