import { describe, expect, it } from "vitest";
import { makeChallenge, numberWords } from "~/lib/gate";
import { seeded } from "~/lib/game";

describe("grown-up gate (FR-2)", () => {
  it("spells numbers the way the spec does", () => {
    expect(numberWords(73)).toBe("seventy-three");
    expect(numberWords(21)).toBe("twenty-one");
    expect(numberWords(90)).toBe("ninety");
  });

  it("offers six unique two-digit choices including the target and its digit swap", () => {
    const rng = seeded(11);
    for (let i = 0; i < 200; i++) {
      const c = makeChallenge(rng);
      expect(c.options).toHaveLength(6);
      expect(new Set(c.options).size).toBe(6);
      expect(c.options).toContain(c.target);
      const swap = (c.target % 10) * 10 + Math.floor(c.target / 10);
      if (swap >= 21) expect(c.options).toContain(swap);
      expect(c.words).toBe(numberWords(c.target));
      c.options.forEach((n) => {
        expect(n).toBeGreaterThanOrEqual(21);
        expect(n).toBeLessThanOrEqual(99);
      });
    }
  });
});
