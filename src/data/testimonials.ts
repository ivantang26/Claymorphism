// Illustrative quotes for a concept product.
export interface Quote {
  quote: string;
  name: string;
  role: string;
  mascot: "pip" | "minty" | "lulu" | "skye";
  audience: "parent" | "teacher";
}

export const QUOTES: Quote[] = [
  {
    quote: "Aarav asks to play before school now. The Sunday email tells me which facts to practise over dinner.",
    name: "Priya Raman",
    role: "Parent of a Year 2 child, Leeds",
    mascot: "pip",
    audience: "parent",
  },
  {
    quote: "I set Lulu's times tables as homework and can see who needs help before Monday's lesson.",
    name: "Tom Okafor",
    role: "Year 4 teacher, Bristol",
    mascot: "lulu",
    audience: "teacher",
  },
  {
    quote: "No adverts, no chat, nothing to buy inside the app. That's why I said yes.",
    name: "Hannah Byrne",
    role: "Parent of two, Norwich",
    mascot: "minty",
    audience: "parent",
  },
  {
    quote: "Every question can be read aloud, so pupils who are still learning to read can play on their own.",
    name: "Aisha Patel",
    role: "SENCo, Leicester",
    mascot: "skye",
    audience: "teacher",
  },
];
