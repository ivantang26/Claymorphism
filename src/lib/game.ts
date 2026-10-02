// Pip's addition demo: 8 questions with adaptive difficulty (FR-1).
// Pure state machine. The Svelte island renders it, plays audio and animates.
// Nothing here is persisted anywhere: state lives in memory for one play.

export const TOTAL_QUESTIONS = 8;

export type Level = 1 | 2 | 3;

/** Highest sum at each level. Level 1 suits a 5-year-old counting on fingers. */
export const LEVEL_MAX: Record<Level, number> = { 1: 5, 2: 10, 3: 20 };

export interface Question {
  a: number;
  b: number;
  answer: number;
  /** Four answer choices, one correct, shuffled. */
  options: number[];
  level: Level;
}

export type Phase = "ready" | "asking" | "correct" | "done";

export interface GameState {
  phase: Phase;
  /** 0-based index of the current question */
  index: number;
  stars: number;
  level: Level;
  question: Question;
  /** Wrong options already tapped for this question (shown as "tried", never a red cross). */
  tried: number[];
  /** Consecutive wrong answers across questions. Two in a row makes the next question easier. */
  wrongStreak: number;
  /** Consecutive first-try correct answers. Two in a row steps the level up. */
  firstTryStreak: number;
  /** Show the counting-dots hint for the current question. */
  showDots: boolean;
  /** Set when the difficulty just dropped, so Pip can say "let's try a smaller one". */
  easedOff: boolean;
}

export type Event =
  | { type: "start" }
  | { type: "answer"; value: number }
  | { type: "next" }
  | { type: "restart" };

export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so tests are deterministic. */
export function seeded(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeQuestion(level: Level, rng: Rng, avoid?: Pick<Question, "a" | "b">): Question {
  const max = LEVEL_MAX[level];
  // level 3 always crosses ten, which is the skill it exists to practise
  const minSum = level === 3 ? 11 : level === 2 ? 5 : 2;
  let a = 0, b = 0;
  for (let tries = 0; tries < 50; tries++) {
    const sum = int(rng, minSum, max);
    a = int(rng, 1, sum - 1);
    b = sum - a;
    const same = avoid && ((avoid.a === a && avoid.b === b) || (avoid.a === b && avoid.b === a));
    if (!same) break;
  }
  const answer = a + b;

  // Distractors are near misses a child might actually make: off by one or two,
  // or one of the addends. Keep them in 0..20 and unique.
  const pool = shuffle([answer - 1, answer + 1, answer - 2, answer + 2, a, b, answer + 3], rng);
  const options = [answer];
  for (const n of pool) {
    if (options.length === 4) break;
    if (n >= 0 && n <= 20 && !options.includes(n)) options.push(n);
  }
  return { a, b, answer, options: shuffle(options, rng), level };
}

export function initialState(rng: Rng): GameState {
  return {
    phase: "ready",
    index: 0,
    stars: 0,
    level: 1,
    question: makeQuestion(1, rng),
    tried: [],
    wrongStreak: 0,
    firstTryStreak: 0,
    showDots: true,
    easedOff: false,
  };
}

/** Dots help pre-readers count. Always on at level 1, otherwise after a wrong answer. */
const dotsFor = (level: Level) => level === 1;

export function reduce(state: GameState, event: Event, rng: Rng): GameState {
  switch (event.type) {
    case "start":
      return state.phase === "ready" ? { ...state, phase: "asking" } : state;

    case "restart":
      return { ...initialState(rng), phase: "asking" };

    case "answer": {
      if (state.phase !== "asking" || state.tried.includes(event.value)) return state;
      const q = state.question;
      if (event.value === q.answer) {
        const firstTry = state.tried.length === 0;
        return {
          ...state,
          phase: "correct",
          stars: state.stars + 1,
          wrongStreak: 0,
          firstTryStreak: firstTry ? state.firstTryStreak + 1 : 0,
          easedOff: false,
        };
      }
      const wrongStreak = state.wrongStreak + 1;
      let { level } = state;
      let easedOff = false;
      if (wrongStreak >= 2 && level > 1) {
        level = (level - 1) as Level;
        easedOff = true;
      }
      return {
        ...state,
        tried: [...state.tried, event.value],
        wrongStreak: wrongStreak >= 2 ? 0 : wrongStreak,
        firstTryStreak: 0,
        showDots: true,
        level,
        easedOff,
      };
    }

    case "next": {
      if (state.phase !== "correct") return state;
      const index = state.index + 1;
      if (index >= TOTAL_QUESTIONS) return { ...state, phase: "done", index: TOTAL_QUESTIONS };
      let { level, firstTryStreak } = state;
      if (firstTryStreak >= 2 && level < 3) {
        level = (level + 1) as Level;
        firstTryStreak = 0;
      }
      return {
        ...state,
        phase: "asking",
        index,
        level,
        firstTryStreak,
        question: makeQuestion(level, rng, state.question),
        tried: [],
        showDots: dotsFor(level),
      };
    }
  }
}

/** Words for the live region and the narration queue. */
export function questionText(q: Pick<Question, "a" | "b">): string {
  return `What is ${q.a} plus ${q.b}?`;
}

/** Match typed digits to an option. Returns the option, "wait" if more digits could follow, or null. */
export function matchTyped(buffer: string, options: number[]): number | "wait" | null {
  if (!buffer) return null;
  const exact = options.find((o) => String(o) === buffer);
  const longer = options.some((o) => String(o).length > buffer.length && String(o).startsWith(buffer));
  if (exact !== undefined && !longer) return exact;
  if (longer) return "wait";
  return exact ?? null;
}
