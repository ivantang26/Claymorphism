import { describe, expect, it } from "vitest";
import { parseTrial, parseDemo } from "~/lib/validation";
import { schoolCost, annualSaving } from "~/lib/pricing";
import { CURRICULUM, YEARS } from "~/data/curriculum";
import { WORLDS } from "~/data/worlds";

describe("trial sign-up (FR-4)", () => {
  const ok = { email: "Sam@Example.com ", yearGroup: "Year 2", grownUp: true };

  it("accepts the minimum and normalises email", () => {
    const { data, errors } = parseTrial(ok);
    expect(errors).toEqual({});
    expect(data.email).toBe("sam@example.com");
    expect(data.childFirstName).toBe("");
  });

  it("collects nothing beyond the allowed fields", () => {
    const { data } = parseTrial({ ...ok, childFirstName: "Aarav", surname: "Raman", dob: "2019-01-01" });
    expect(Object.keys(data).sort()).toEqual(["childFirstName", "email", "grownUp", "plan", "source", "yearGroup"]);
  });

  it("rejects bad input with plain-English messages", () => {
    const { errors } = parseTrial({ email: "nope", childFirstName: "<script>", yearGroup: "Year 9" });
    expect(errors.email).toMatch(/email address/);
    expect(errors.childFirstName).toBeTruthy();
    expect(errors.yearGroup).toBeTruthy();
    expect(errors.grownUp).toBeTruthy();
  });
});

describe("school demo booking (FR-5)", () => {
  it("needs name, email, school, role, pupils and a slot", () => {
    const { errors } = parseDemo({});
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "pupils", "role", "school", "slot"]);
  });

  it("accepts numbers from JSON and strings from form posts", () => {
    const base = { name: "Tom", email: "t@school.sch.uk", school: "St Aidan's", role: "Class teacher", slot: "2026-10-05T09:00" };
    expect(parseDemo({ ...base, pupils: 210 }).errors).toEqual({});
    expect(parseDemo({ ...base, pupils: "210" }).errors).toEqual({});
  });
});

describe("pricing (FR-7)", () => {
  it("is free up to 30 pupils, then per pupil beyond that", () => {
    expect(schoolCost(30)).toBe(0);
    expect(schoolCost(31)).toBe(2.4);
    expect(schoolCost(210)).toBe(432);
  });

  it("annual saves about a third", () => expect(annualSaving()).toBe(33));
});

describe("curriculum explorer (FR-6)", () => {
  it("covers every world for Years 1 to 6", () => {
    expect([...YEARS]).toEqual([1, 2, 3, 4, 5, 6]);
    for (const y of YEARS) {
      for (const w of WORLDS) {
        const c = CURRICULUM[y][w.id];
        expect(c.topics.length).toBeGreaterThanOrEqual(2);
        expect(c.strand).toMatch(/^Number:/);
      }
    }
  });

  it("puts the right times tables in the right years", () => {
    expect(CURRICULUM[2].times.topics.join()).toMatch(/2, 5 and 10/);
    expect(CURRICULUM[3].times.topics.join()).toMatch(/3, 4 and 8/);
    expect(CURRICULUM[4].times.topics.join()).toMatch(/12 × 12/);
  });
});
