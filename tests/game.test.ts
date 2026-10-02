import { describe, expect, it } from "vitest";
import { initialState, makeQuestion, matchTyped, reduce, seeded, TOTAL_QUESTIONS, LEVEL_MAX, type GameState } from "~/lib/game";

const play = (s: GameState, rng: () => number, value: number) => reduce(s, { type: "answer", value }, rng);
const wrongOption = (s: GameState) => s.question.options.find((o) => o !== s.question.answer && !s.tried.includes(o))!;

describe("questions", () => {
  it("stay within the level's range, with four unique options including the answer", () => {
    const rng = seeded(7);
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 300; i++) {
        const q = makeQuestion(level, rng);
        expect(q.a + q.b).toBe(q.answer);
        expect(q.a).toBeGreaterThan(0);
        expect(q.b).toBeGreaterThan(0);
        expect(q.answer).toBeLessThanOrEqual(LEVEL_MAX[level]);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answer);
        q.options.forEach((o) => expect(o).toBeGreaterThanOrEqual(0));
        if (level === 3) expect(q.answer).toBeGreaterThan(10);
      }
    }
  });

  it("never repeats the same sum twice in a row", () => {
    const rng = seeded(3);
    let prev = makeQuestion(1, rng);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(1, rng, prev);
      expect([q.a, q.b].sort()).not.toEqual([prev.a, prev.b].sort());
      prev = q;
    }
  });
});

describe("game flow (FR-1)", () => {
  it("has 8 questions and ends with a star for each", () => {
    const rng = seeded(1);
    let s = reduce(initialState(rng), { type: "start" }, rng);
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      expect(s.phase).toBe("asking");
      s = play(s, rng, s.question.answer);
      expect(s.phase).toBe("correct");
      s = reduce(s, { type: "next" }, rng);
    }
    expect(s.phase).toBe("done");
    expect(s.stars).toBe(8);
  });

  it("gets easier after two wrong answers", () => {
    const rng = seeded(2);
    let s: GameState = { ...reduce(initialState(rng), { type: "start" }, rng), level: 3, question: makeQuestion(3, rng) };
    s = play(s, rng, wrongOption(s));
    expect(s.level).toBe(3);
    s = play(s, rng, wrongOption(s));
    expect(s.level).toBe(2);
    expect(s.easedOff).toBe(true);
    s = play(s, rng, s.question.answer);
    s = reduce(s, { type: "next" }, rng);
    expect(s.question.level).toBe(2);
    expect(s.question.answer).toBeLessThanOrEqual(LEVEL_MAX[2]);
  });

  it("steps up after two first-try answers", () => {
    const rng = seeded(4);
    let s = reduce(initialState(rng), { type: "start" }, rng);
    for (let i = 0; i < 2; i++) {
      s = play(s, rng, s.question.answer);
      s = reduce(s, { type: "next" }, rng);
    }
    expect(s.level).toBe(2);
  });

  it("marks wrong taps as tried, shows the dots hint and ignores repeat taps", () => {
    const rng = seeded(5);
    let s: GameState = { ...reduce(initialState(rng), { type: "start" }, rng), level: 2, showDots: false };
    const wrong = wrongOption(s);
    s = play(s, rng, wrong);
    expect(s.tried).toEqual([wrong]);
    expect(s.showDots).toBe(true);
    const again = play(s, rng, wrong);
    expect(again).toBe(s);
  });

  it("ignores answers before start and after a correct answer", () => {
    const rng = seeded(6);
    const s0 = initialState(rng);
    expect(play(s0, rng, s0.question.answer)).toBe(s0);
    let s = reduce(s0, { type: "start" }, rng);
    s = play(s, rng, s.question.answer);
    expect(play(s, rng, s.question.options[0])).toBe(s);
  });
});

describe("typed answers (keyboard)", () => {
  it("matches single digits straight away", () => expect(matchTyped("7", [3, 7, 9, 5])).toBe(7));
  it("waits when a longer option starts with the digits", () => expect(matchTyped("1", [1, 12, 9, 5])).toBe("wait"));
  it("matches two-digit answers", () => expect(matchTyped("12", [1, 12, 9, 5])).toBe(12));
  it("returns null for no match", () => expect(matchTyped("4", [1, 12, 9, 5])).toBeNull());
});
