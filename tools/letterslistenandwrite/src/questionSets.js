// Question sets and slot-machine rules (shared by the student page and tests).

export const ALPHABET = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index),
);
const FIRST_HALF = ALPHABET.slice(0, 13); // A–M
const SECOND_HALF = ALPHABET.slice(13); // N–Z

// Fewer letters → a slot round comes sooner.
export const defaultSlotEvery = (count) => (count <= 13 ? 3 : 5);

// The five fixed sets. They live in code and cannot be edited.
export const FIXED_SETS = [
  { id: "all", name: "全部字母大小寫", letters: ALPHABET, order: "random", slotEvery: 5 },
  { id: "am-seq", name: "A–M 依序大小寫", letters: FIRST_HALF, order: "sequential", slotEvery: 3 },
  { id: "am-rand", name: "A–M 亂序大小寫", letters: FIRST_HALF, order: "random", slotEvery: 3 },
  { id: "nz-seq", name: "N–Z 依序大小寫", letters: SECOND_HALF, order: "sequential", slotEvery: 3 },
  { id: "nz-rand", name: "N–Z 亂序大小寫", letters: SECOND_HALF, order: "random", slotEvery: 3 },
].map((set) => ({ ...set, fixed: true }));

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

// Letters in the order they will be asked. Sequential keeps A→Z order.
export function buildQuestions(set, random = Math.random) {
  const letters = [...new Set(set.letters)]
    .filter((letter) => ALPHABET.includes(letter))
    .sort();
  return set.order === "random" ? shuffle(letters, random) : letters;
}

// Answered-question counts after which a slot round starts: every N correct
// answers, plus one more round after the last question if it was not already one.
export function slotRoundPoints(total, every) {
  const points = [];
  for (let count = every; count <= total; count += every) points.push(count);
  if (total > 0 && points.at(-1) !== total) points.push(total);
  return points;
}

export const PULLS_PER_ROUND = 3;

// Reel symbols, best first.
export const SYMBOLS = [
  { id: "seven", label: "7" },
  { id: "diamond", label: "鑽石" },
  { id: "crown", label: "皇冠" },
  { id: "star", label: "星星" },
  { id: "cherry", label: "櫻桃" },
  { id: "bell", label: "鈴鐺" },
];

// Points for one pull: three 7s 500, three of a kind 200, two of a kind 50, else 10.
export function scorePull(symbolIds) {
  const counts = new Map();
  for (const id of symbolIds) counts.set(id, (counts.get(id) || 0) + 1);
  const most = Math.max(...counts.values());
  if (most === 3) return symbolIds[0] === "seven" ? 500 : 200;
  if (most === 2) return 50;
  return 10;
}

export function prizeName(points) {
  if (points >= 500) return "超級大獎";
  if (points >= 200) return "大獎";
  if (points >= 50) return "中獎";
  return "安慰獎";
}

// Each reel stops on a random symbol. A small boost makes matches a bit more
// common so children see prizes regularly (about 1 in 3 pulls wins 50+).
export function randomPull(random = Math.random) {
  const pick = () => SYMBOLS[Math.floor(random() * SYMBOLS.length)].id;
  const first = pick();
  const second = random() < 0.28 ? first : pick();
  const third = random() < 0.22 ? (random() < 0.5 ? first : second) : pick();
  return [first, second, third];
}

export function describeSet(set) {
  const count = new Set(set.letters).size;
  const order = set.order === "random" ? "亂序" : "依序";
  return `${count} 題・${order}・每對 ${set.slotEvery} 題拉霸`;
}
