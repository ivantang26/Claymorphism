// Phosphor icons (bold weight), inlined as raw SVG so they inherit currentColor.
// Only the icons listed here end up in the bundle.
const NAMES = [
  "play", "star", "lock-simple", "speaker-high", "speaker-slash", "arrow-left", "arrow-right", "check",
  "shield-check", "prohibit", "chat-circle-slash", "shopping-cart-simple", "eye-slash", "envelope-simple",
  "clock", "moon", "chart-bar", "users-three", "calendar-blank", "list", "x", "graduation-cap", "house",
  "cookie", "sparkle", "trophy", "hand-tap", "ear", "keyboard", "arrow-counter-clockwise", "download-simple",
  "book-open-text", "student", "check-circle", "info", "warning-circle", "caret-down", "plus", "minus",
  "puzzle-piece", "timer", "heart",
] as const;

export type IconName = (typeof NAMES)[number];

const files = import.meta.glob<string>(
  "/node_modules/@phosphor-icons/core/assets/bold/{play,star,lock-simple,speaker-high,speaker-slash,arrow-left,arrow-right,check,shield-check,prohibit,chat-circle-slash,shopping-cart-simple,eye-slash,envelope-simple,clock,moon,chart-bar,users-three,calendar-blank,list,x,graduation-cap,house,cookie,sparkle,trophy,hand-tap,ear,keyboard,arrow-counter-clockwise,download-simple,book-open-text,student,check-circle,info,warning-circle,caret-down,plus,minus,puzzle-piece,timer,heart}-bold.svg",
  { query: "?raw", import: "default", eager: true },
);

const icons = Object.fromEntries(
  Object.entries(files).map(([p, svg]) => [
    p.split("/").pop()!.replace("-bold.svg", ""),
    svg.replace("<svg ", '<svg aria-hidden="true" focusable="false" '),
  ]),
) as Record<IconName, string>;

export function icon(name: IconName): string {
  const svg = icons[name];
  if (!svg) throw new Error(`Icon "${name}" is not in src/lib/icons.ts`);
  return svg;
}

export { NAMES as ICON_NAMES };
