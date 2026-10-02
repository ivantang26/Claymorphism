// Curriculum explorer data (FR-6).
// Mapped to the statutory programmes of study in the national curriculum in
// England: mathematics (DfE, 2013), Years 1 to 6. Wording is condensed from
// the statutory requirements for each year.

import type { WorldId } from "./worlds";

export const YEARS = [1, 2, 3, 4, 5, 6] as const;
export type Year = (typeof YEARS)[number];

export interface Coverage {
  /** National curriculum strand the topics sit under */
  strand: string;
  topics: string[];
}

export const CURRICULUM: Record<Year, Record<WorldId, Coverage>> = {
  1: {
    addition: {
      strand: "Number: addition and subtraction",
      topics: [
        "Read, write and use +, − and = signs",
        "Number bonds and addition facts within 20",
        "Add one-digit and two-digit numbers to 20, including zero",
        "One-step problems with objects and pictures",
      ],
    },
    subtraction: {
      strand: "Number: addition and subtraction",
      topics: [
        "Subtraction facts within 20",
        "Subtract one-digit and two-digit numbers to 20, including zero",
        "Missing number problems such as 7 = ? − 9",
      ],
    },
    times: {
      strand: "Number: multiplication and division",
      topics: [
        "Count in multiples of twos, fives and tens",
        "One-step multiplication problems with objects and arrays",
      ],
    },
    fractions: {
      strand: "Number: fractions",
      topics: [
        "Find and name a half as one of two equal parts",
        "Find and name a quarter as one of four equal parts",
      ],
    },
  },
  2: {
    addition: {
      strand: "Number: addition and subtraction",
      topics: [
        "Recall addition facts to 20 fluently and derive facts to 100",
        "Add a two-digit number and ones, and a two-digit number and tens",
        "Add two two-digit numbers, and three one-digit numbers",
        "Know that addition can be done in any order",
      ],
    },
    subtraction: {
      strand: "Number: addition and subtraction",
      topics: [
        "Subtract ones and tens from a two-digit number",
        "Subtract two two-digit numbers",
        "Know that subtraction cannot be done in any order",
        "Use the inverse to check calculations",
      ],
    },
    times: {
      strand: "Number: multiplication and division",
      topics: [
        "Recall the 2, 5 and 10 times tables",
        "Spot odd and even numbers",
        "Write number sentences with ×, ÷ and =",
        "Know that multiplication can be done in any order",
      ],
    },
    fractions: {
      strand: "Number: fractions",
      topics: [
        "Find and write ⅓, ¼, ²⁄₄ and ¾ of a shape, length or set",
        "Know that ²⁄₄ is the same as ½",
      ],
    },
  },
  3: {
    addition: {
      strand: "Number: addition and subtraction",
      topics: [
        "Add three-digit numbers with columnar addition",
        "Add ones, tens and hundreds to a three-digit number mentally",
        "Estimate answers and use the inverse to check",
      ],
    },
    subtraction: {
      strand: "Number: addition and subtraction",
      topics: [
        "Subtract three-digit numbers with columnar subtraction",
        "Subtract ones, tens and hundreds mentally",
        "Solve missing number problems",
      ],
    },
    times: {
      strand: "Number: multiplication and division",
      topics: [
        "Recall the 3, 4 and 8 times tables",
        "Multiply a two-digit number by a one-digit number",
        "Solve problems including scaling and correspondence",
      ],
    },
    fractions: {
      strand: "Number: fractions",
      topics: [
        "Count up and down in tenths",
        "Find unit and non-unit fractions of a set",
        "Add and subtract fractions with the same denominator within one whole",
        "Compare and order unit fractions",
      ],
    },
  },
  4: {
    addition: {
      strand: "Number: addition and subtraction",
      topics: [
        "Add numbers with up to four digits using columnar addition",
        "Estimate and use the inverse to check answers",
        "Two-step problems, choosing the right operation",
      ],
    },
    subtraction: {
      strand: "Number: addition and subtraction",
      topics: [
        "Subtract numbers with up to four digits using columnar subtraction",
        "Two-step problems, choosing the right operation",
      ],
    },
    times: {
      strand: "Number: multiplication and division",
      topics: [
        "Recall all times tables up to 12 × 12",
        "Multiply two-digit and three-digit numbers by a one-digit number",
        "Find factor pairs and use them mentally",
      ],
    },
    fractions: {
      strand: "Number: fractions (including decimals)",
      topics: [
        "Recognise families of equivalent fractions",
        "Count up and down in hundredths",
        "Add and subtract fractions with the same denominator",
        "Know decimal equivalents of tenths, hundredths, ¼, ½ and ¾",
      ],
    },
  },
  5: {
    addition: {
      strand: "Number: addition and subtraction",
      topics: [
        "Add whole numbers with more than four digits",
        "Add mentally with increasingly large numbers",
        "Use rounding to check answers",
      ],
    },
    subtraction: {
      strand: "Number: addition and subtraction",
      topics: [
        "Subtract whole numbers with more than four digits",
        "Multi-step problems, deciding which operations to use",
      ],
    },
    times: {
      strand: "Number: multiplication and division",
      topics: [
        "Multiply up to four digits by a two-digit number (long multiplication)",
        "Multiples, factors and prime numbers",
        "Square and cube numbers",
      ],
    },
    fractions: {
      strand: "Number: fractions (including decimals and percentages)",
      topics: [
        "Compare and order fractions with related denominators",
        "Mixed numbers and improper fractions",
        "Multiply fractions and mixed numbers by whole numbers",
        "Understand per cent and simple percentages",
      ],
    },
  },
  6: {
    addition: {
      strand: "Number: addition, subtraction, multiplication and division",
      topics: [
        "Multi-step problems in context",
        "Use the order of operations with all four operations",
        "Use estimation to check answers",
      ],
    },
    subtraction: {
      strand: "Number: addition, subtraction, multiplication and division",
      topics: [
        "Multi-step problems, deciding which operations to use",
        "Check answers with estimation and the inverse",
      ],
    },
    times: {
      strand: "Number: addition, subtraction, multiplication and division",
      topics: [
        "Long multiplication up to four digits by two digits",
        "Long and short division",
        "Common factors, common multiples and prime numbers",
      ],
    },
    fractions: {
      strand: "Number: fractions (including decimals and percentages)",
      topics: [
        "Simplify fractions using common factors",
        "Add and subtract fractions with different denominators",
        "Multiply pairs of proper fractions and divide fractions by whole numbers",
        "Link fractions, decimals and percentages",
      ],
    },
  },
};

/** Age of the children in each year group, for the explorer label. */
export const yearAges = (y: Year) => `Ages ${y + 4} to ${y + 5}`;
