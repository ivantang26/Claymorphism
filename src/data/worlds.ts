// The four maths worlds and their mascots.

export type WorldId = "addition" | "subtraction" | "times" | "fractions";
export type Mascot = "pip" | "minty" | "lulu" | "skye";
export type ClayColour = "peach" | "mint" | "lilac" | "sky";

export interface World {
  id: WorldId;
  mascot: Mascot;
  mascotName: string;
  colour: ClayColour;
  name: string;
  topic: string;
  ages: string;
  years: string;
  /** Short line a 7-year-old can read. */
  kidLine: string;
  /** Short alt text for the mascot image. */
  alt: string;
  island: ClayColour;
}

export const WORLDS: World[] = [
  {
    id: "addition",
    mascot: "pip",
    mascotName: "Pip",
    colour: "peach",
    name: "Plus Park",
    topic: "Adding",
    ages: "Ages 5 to 9",
    years: "Years 1 to 4",
    kidLine: "Hop, count and add with Pip.",
    alt: "Pip, the peach addition friend",
    island: "lilac",
  },
  {
    id: "subtraction",
    mascot: "minty",
    mascotName: "Minty",
    colour: "mint",
    name: "Take-Away Tunnels",
    topic: "Taking away",
    ages: "Ages 5 to 9",
    years: "Years 1 to 4",
    kidLine: "Dig for answers with Minty.",
    alt: "Minty, the mint subtraction friend",
    island: "peach",
  },
  {
    id: "times",
    mascot: "lulu",
    mascotName: "Lulu",
    colour: "lilac",
    name: "Times Tower",
    topic: "Times tables",
    ages: "Ages 6 to 11",
    years: "Years 2 to 6",
    kidLine: "Climb higher with Lulu.",
    alt: "Lulu, the lilac times tables friend",
    island: "sky",
  },
  {
    id: "fractions",
    mascot: "skye",
    mascotName: "Skye",
    colour: "sky",
    name: "Fraction Sky",
    topic: "Fractions",
    ages: "Ages 5 to 11",
    years: "Years 1 to 6",
    kidLine: "Share out the clouds with Skye.",
    alt: "Skye, the sky-blue fractions friend",
    island: "mint",
  },
];

export const worldById = (id: WorldId) => WORLDS.find((w) => w.id === id)!;

/** srcset for a mascot render served as WebP at two sizes. */
export const mascotSrc = (m: Mascot, mood: "idle" | "happy" = "idle") => ({
  src: `/art/${m}-${mood}-320.webp`,
  srcset: `/art/${m}-${mood}-320.webp 320w, /art/${m}-${mood}-640.webp 640w`,
});
