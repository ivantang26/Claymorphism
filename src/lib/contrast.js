// WCAG contrast helpers and a tiny tokens.css parser.
// Shared by scripts/check-contrast.mjs (build gate) and the component library page.

/** @param {string} hex */
export function luminance(hex) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {string} a @param {string} b */
export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pull `--name: #hex;` declarations out of the light :root block and the
 * prefers-color-scheme: dark block of tokens.css.
 * @param {string} css
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}
 */
export function parseTokens(css) {
  const grab = (block) =>
    Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2].toLowerCase()]));
  const rootEnd = css.indexOf("}", css.indexOf(":root"));
  const light = grab(css.slice(css.indexOf(":root"), rootEnd));
  const darkStart = css.indexOf("prefers-color-scheme: dark");
  const dark = { ...light, ...grab(css.slice(darkStart, css.indexOf("}", css.indexOf(":root", darkStart)))) };
  return { light, dark };
}

/**
 * Every text/background pairing used on the site. `min` is the ratio it must meet.
 * The spec asks for 7:1 for text on clay; we hold all body text to that.
 * @param {{ light: Record<string,string>, dark: Record<string,string> }} t
 */
export function textPairs(t) {
  const L = t.light, D = t.dark;
  const clays = ["clay-peach", "clay-mint", "clay-lilac", "clay-sky", "clay-lemon", "clay-pink"];
  return [
    ...clays.map((c) => ({ mode: "both", fg: "ink", bg: c, fgHex: L.ink, bgHex: L[c], min: 7 })),
    { mode: "light", fg: "ink", bg: "bg", fgHex: L.ink, bgHex: L.bg, min: 7 },
    { mode: "both", fg: "ink", bg: "clay-cream", fgHex: L.ink, bgHex: L["clay-cream"], min: 7 },
    { mode: "both", fg: "ink", bg: "card white #fffdf9", fgHex: L.ink, bgHex: "#fffdf9", min: 7 },
    { mode: "light", fg: "error #9b1c14", bg: "card white #fffdf9", fgHex: "#9b1c14", bgHex: "#fffdf9", min: 7 },
    { mode: "dark", fg: "text", bg: "bg", fgHex: D.text, bgHex: D.bg, min: 7 },
    { mode: "dark", fg: "text", bg: "surface", fgHex: D.text, bgHex: D.surface, min: 7 },
    { mode: "dark", fg: "error #ffb4a8", bg: "surface", fgHex: "#ffb4a8", bgHex: D.surface, min: 7 },
    // focus rings are non-text: 3:1 against the page
    { mode: "light", fg: "focus ring", bg: "bg", fgHex: L.focus, bgHex: L.bg, min: 3 },
    { mode: "dark", fg: "focus ring", bg: "bg", fgHex: D.focus, bgHex: D.bg, min: 3 },
  ];
}
