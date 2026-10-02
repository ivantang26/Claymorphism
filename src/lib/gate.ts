// Parental gate (FR-2): "Tap the number seventy-three".
// Reading a two-digit number word and finding its numeral is easy for an adult
// and hard for a pre-reader, which is the whole point.

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 21 || n > 99) throw new Error("Gate numbers are 21 to 99");
  const t = Math.floor(n / 10), o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
}

export interface Challenge {
  target: number;
  words: string;
  options: number[];
}

/** Six choices: the target, its digit swap (the classic child's guess) and four others. */
export function makeChallenge(rng: () => number = Math.random): Challenge {
  let target = 0;
  // avoid round tens and doubles like 44, where the digit swap is the same number
  do target = 21 + Math.floor(rng() * 79);
  while (target % 10 === 0 || Math.floor(target / 10) === target % 10);
  const swapped = (target % 10) * 10 + Math.floor(target / 10);
  const options = new Set<number>([target]);
  if (swapped >= 21) options.add(swapped);
  while (options.size < 6) {
    const n = 21 + Math.floor(rng() * 79);
    if (n % 10 !== 0) options.add(n);
  }
  const list = [...options];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { target, words: numberWords(target), options: list };
}
