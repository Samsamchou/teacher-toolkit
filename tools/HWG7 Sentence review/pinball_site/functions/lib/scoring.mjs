/**
 * Deterministic A1 speaking-practice scoring.
 *
 * This module scores transcript text and caller-supplied timing metrics. It is
 * not a phoneme or standardized pronunciation assessment. Stress, intonation,
 * chunks, and linking are used only as feedback references.
 */

export const RUBRIC_VERSION = "a1-v2-answer-only";
export const DEFAULT_PASS_SCORE = 80;

export const SCORING_SCOPE = Object.freeze({
  phonemeAssessment: false,
  standardizedAssessment: false,
  stressAndIntonation: "feedback_only",
});

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

const roundScore = (value) => Math.round(clamp(Number.isFinite(value) ? value : 0));

const nonNegativeInteger = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
};

const positiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

/** Normalize English transcript text without inventing answer equivalences. */
export function normalizeText(value) {
  if (value === null || value === undefined) return "";

  const raw = String(value)
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02bc\u2032]/gu, "'")
    .replace(/[\u2010-\u2015-]/gu, " ")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/gu, " ");

  return raw
    .split(/\s+/u)
    .map((token) => token.replace(/^'+|'+$/gu, ""))
    .filter(Boolean)
    .join(" ");
}

export const CLOCK_TRANSCRIPT_CANONICALIZER = "clock-en-v1";

const HOUR_WORDS = Object.freeze({
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
});
const NUMBER_ONES = Object.freeze([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
]);
const NUMBER_TEENS = Object.freeze([
  "ten", "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
]);
const NUMBER_TENS = Object.freeze({
  20: "twenty",
  30: "thirty",
  40: "forty",
  50: "fifty",
});
const MINUTE_WORD_VALUES = new Map([
  ...NUMBER_ONES.slice(1).map((word, index) => [word, index + 1]),
  ...NUMBER_TEENS.map((word, index) => [word, index + 10]),
  ...Object.entries(NUMBER_TENS).map(([value, word]) => [word, Number(value)]),
]);

function usesClockCanonicalizer(question) {
  return [
    question?.transcriptCanonicalizer,
    question?.canonicalizer,
    question?.normalizationProfile,
    question?.transcriptNormalization?.profile,
  ].includes(CLOCK_TRANSCRIPT_CANONICALIZER);
}

function numberUnderSixty(value) {
  if (!Number.isInteger(value) || value < 0 || value > 59) return null;
  if (value < 10) return NUMBER_ONES[value];
  if (value < 20) return NUMBER_TEENS[value - 10];
  const tens = Math.floor(value / 10) * 10;
  const remainder = value % 10;
  return remainder ? `${NUMBER_TENS[tens]}-${NUMBER_ONES[remainder]}` : NUMBER_TENS[tens];
}

function clockPhrase(hour, minute) {
  const hourWord = Object.entries(HOUR_WORDS).find(([, value]) => value === hour)?.[0];
  if (!hourWord) return null;
  if (minute === 0) return `${hourWord} o'clock`;
  const minuteWord = numberUnderSixty(minute);
  return minuteWord ? `${hourWord} ${minuteWord}` : null;
}

function clockValue(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function readMinute(tokens, start) {
  const first = tokens[start];
  if (first === "o'clock") return { minute: 0, length: 1 };
  if (first === "oh" && MINUTE_WORD_VALUES.has(tokens[start + 1])) {
    const minute = MINUTE_WORD_VALUES.get(tokens[start + 1]);
    return minute < 10 ? { minute, length: 2 } : null;
  }

  const base = MINUTE_WORD_VALUES.get(first);
  if (base === undefined || base < 10) return null;
  if ([20, 30, 40, 50].includes(base) && HOUR_WORDS[tokens[start + 1]] <= 9) {
    return { minute: base + HOUR_WORDS[tokens[start + 1]], length: 2 };
  }
  return { minute: base, length: 1 };
}

function clockValuesFromDisplay(display) {
  const tokens = normalizeText(display).split(" ").filter(Boolean);
  const values = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const hour = HOUR_WORDS[tokens[index]];
    if (!hour) continue;
    const minute = readMinute(tokens, index + 1);
    if (!minute) continue;
    values.push(clockValue(hour, minute.minute));
    index += minute.length;
  }
  return [...new Set(values)];
}

function canonicalClockDisplay(rawTranscript) {
  let display = rawTranscript
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02bc\u2032]/gu, "'")
    .toLowerCase();

  display = display.replace(
    /\b([1-9]|1[0-2])\s*[:.]\s*([0-5]\d)\b/gu,
    (_, hour, minute) => clockPhrase(Number(hour), Number(minute)),
  );
  display = display.replace(
    /\b([1-9]|1[0-2])\s+([0-5]\d)\b/gu,
    (_, hour, minute) => clockPhrase(Number(hour), Number(minute)),
  );
  display = display
    .replace(/\bo\s*'?\s*clock\b|\boclock\b/gu, "o'clock")
    .replace(
      /\b(twenty|thirty|forty|fifty)[ -]+(one|two|three|four|five|six|seven|eight|nine)\b/gu,
      "$1-$2",
    )
    .replace(/[^a-z0-9'\-\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return display;
}

/**
 * Canonicalize only questions explicitly marked clock-en-v1. The conversion is
 * based exclusively on what was transcribed; it never consults the target time.
 */
export function canonicalizeTranscriptForQuestion(question, value) {
  const rawTranscript = value === null || value === undefined ? "" : String(value);
  if (!usesClockCanonicalizer(question)) {
    const canonicalTranscript = normalizeText(rawTranscript);
    return {
      profile: null,
      rawTranscript,
      canonicalTranscript,
      displayTranscript: rawTranscript.trim(),
      clockValue: null,
      valid: Boolean(canonicalTranscript),
      systemLike: false,
      invalidReason: canonicalTranscript ? null : "empty_transcript",
    };
  }

  if (/\b\d{3,4}\b/u.test(rawTranscript)) {
    return {
      profile: CLOCK_TRANSCRIPT_CANONICALIZER,
      rawTranscript,
      canonicalTranscript: "",
      displayTranscript: rawTranscript.trim(),
      clockValue: null,
      valid: false,
      systemLike: true,
      invalidReason: "ambiguous_clock_digits",
    };
  }

  const displayTranscript = canonicalClockDisplay(rawTranscript);
  const values = clockValuesFromDisplay(displayTranscript);
  return {
    profile: CLOCK_TRANSCRIPT_CANONICALIZER,
    rawTranscript,
    canonicalTranscript: displayTranscript,
    displayTranscript,
    clockValue: values.length === 1 ? values[0] : null,
    valid: Boolean(normalizeText(displayTranscript)),
    systemLike: false,
    invalidReason: normalizeText(displayTranscript) ? null : "empty_transcript",
  };
}

function clockCoreCorrect(question, actualState, expectedText) {
  if (!usesClockCanonicalizer(question)) return true;
  const expectedState = canonicalizeTranscriptForQuestion(question, expectedText);
  return Boolean(
    actualState.clockValue &&
    expectedState.clockValue &&
    actualState.clockValue === expectedState.clockValue,
  );
}

export function tokenize(value) {
  if (Array.isArray(value)) {
    return value.flatMap((token) => tokenize(token));
  }

  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

const SIMPLE_CONTRACTIONS = Object.freeze({
  "aren't": ["are", "not"],
  "can't": ["can", "not"],
  "couldn't": ["could", "not"],
  "didn't": ["did", "not"],
  "doesn't": ["does", "not"],
  "don't": ["do", "not"],
  "hadn't": ["had", "not"],
  "hasn't": ["has", "not"],
  "haven't": ["have", "not"],
  "isn't": ["is", "not"],
  "shouldn't": ["should", "not"],
  "wasn't": ["was", "not"],
  "weren't": ["were", "not"],
  "won't": ["will", "not"],
  "wouldn't": ["would", "not"],
  "i'm": ["i", "am"],
  "you're": ["you", "are"],
  "we're": ["we", "are"],
  "they're": ["they", "are"],
  "i'd": ["i", "would"],
  "you'd": ["you", "would"],
  "he'd": ["he", "would"],
  "she'd": ["she", "would"],
  "we'd": ["we", "would"],
  "they'd": ["they", "would"],
  "i'll": ["i", "will"],
  "you'll": ["you", "will"],
  "he'll": ["he", "will"],
  "she'll": ["she", "will"],
  "we'll": ["we", "will"],
  "they'll": ["they", "will"],
  "i've": ["i", "have"],
  "you've": ["you", "have"],
  "we've": ["we", "have"],
  "they've": ["they", "have"],
  "let's": ["let", "us"],
});

const AMBIGUOUS_CONTRACTIONS = Object.freeze({
  "he's": "he",
  "she's": "she",
  "it's": "it",
  "that's": "that",
  "what's": "what",
  "who's": "who",
  "where's": "where",
  "there's": "there",
  "here's": "here",
  "how's": "how",
});

function targetAuxiliary(subject, targetTokens) {
  for (let index = 0; index < targetTokens.length - 1; index += 1) {
    if (targetTokens[index] === subject && ["is", "has"].includes(targetTokens[index + 1])) {
      return targetTokens[index + 1];
    }
  }
  return "is";
}

/** Canonical tokens used only for deterministic target-aware comparison. */
export function equivalentTokens(value, target = "") {
  const targetTokens = tokenize(target);
  return tokenize(value).flatMap((token) => {
    if (SIMPLE_CONTRACTIONS[token]) return SIMPLE_CONTRACTIONS[token];
    const subject = AMBIGUOUS_CONTRACTIONS[token];
    return subject ? [subject, targetAuxiliary(subject, targetTokens)] : [token];
  });
}
function maximumRunLength(tokens, wanted) {
  let maximum = 0;
  let current = 0;
  for (const token of tokens) {
    current = token === wanted ? current + 1 : 0;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

function separateImmediateRepetitions(expectedTokens, actualTokens) {
  const keptTokens = [];
  const keptIndices = [];
  const repetitionOperations = [];

  for (let start = 0; start < actualTokens.length; ) {
    const token = actualTokens[start];
    let end = start + 1;
    while (end < actualTokens.length && actualTokens[end] === token) end += 1;

    const runLength = end - start;
    const targetRun = maximumRunLength(expectedTokens, token);
    const keepCount = Math.min(runLength, Math.max(1, targetRun));

    for (let offset = 0; offset < keepCount; offset += 1) {
      keptTokens.push(token);
      keptIndices.push(start + offset);
    }
    for (let offset = keepCount; offset < runLength; offset += 1) {
      repetitionOperations.push({
        op: "repetition",
        targetIndex: null,
        transcriptIndex: start + offset,
        expected: null,
        actual: token,
      });
    }
    start = end;
  }

  return { keptTokens, keptIndices, repetitionOperations };
}

/**
 * Word-level Levenshtein alignment.
 *
 * C = correct, S = substitution, D = deletion, E = non-repetition insertion,
 * R = immediate repetition. Repetitions are excluded from E to avoid double
 * deduction and are handled by the fluency formula.
 */
export function alignWords(expected, actual) {
  const expectedTokens = equivalentTokens(expected, expected);
  const actualTokens = equivalentTokens(actual, expectedTokens);
  const { keptTokens: alignedActualTokens, keptIndices, repetitionOperations } =
    separateImmediateRepetitions(expectedTokens, actualTokens);
  const rows = expectedTokens.length + 1;
  const columns = alignedActualTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));
  const matchMatrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const same = expectedTokens[row - 1] === alignedActualTokens[column - 1];
      const candidates = [
        {
          cost: matrix[row - 1][column - 1] + (same ? 0 : 1),
          matches: matchMatrix[row - 1][column - 1] + (same ? 1 : 0),
        },
        { cost: matrix[row - 1][column] + 1, matches: matchMatrix[row - 1][column] },
        { cost: matrix[row][column - 1] + 1, matches: matchMatrix[row][column - 1] },
      ].sort((left, right) => left.cost - right.cost || right.matches - left.matches);
      matrix[row][column] = candidates[0].cost;
      matchMatrix[row][column] = candidates[0].matches;
    }
  }

  const reversed = [];
  let row = expectedTokens.length;
  let column = alignedActualTokens.length;

  while (row > 0 || column > 0) {
    const expectedToken = row > 0 ? expectedTokens[row - 1] : null;
    const actualToken = column > 0 ? alignedActualTokens[column - 1] : null;
    const originalTranscriptIndex = column > 0 ? keptIndices[column - 1] : null;

    if (
      row > 0 &&
      column > 0 &&
      expectedToken === actualToken &&
      matrix[row][column] === matrix[row - 1][column - 1] &&
      matchMatrix[row][column] === matchMatrix[row - 1][column - 1] + 1
    ) {
      reversed.push({
        op: "correct",
        targetIndex: row - 1,
        transcriptIndex: originalTranscriptIndex,
        expected: expectedToken,
        actual: actualToken,
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (
      row > 0 &&
      column > 0 &&
      matrix[row][column] === matrix[row - 1][column - 1] + 1 &&
      matchMatrix[row][column] === matchMatrix[row - 1][column - 1]
    ) {
      reversed.push({
        op: "substitution",
        targetIndex: row - 1,
        transcriptIndex: originalTranscriptIndex,
        expected: expectedToken,
        actual: actualToken,
      });
      row -= 1;
      column -= 1;
      continue;
    }

    if (
      row > 0 &&
      matrix[row][column] === matrix[row - 1][column] + 1 &&
      matchMatrix[row][column] === matchMatrix[row - 1][column]
    ) {
      reversed.push({
        op: "deletion",
        targetIndex: row - 1,
        transcriptIndex: null,
        expected: expectedToken,
        actual: null,
      });
      row -= 1;
      continue;
    }

    reversed.push({
      op: "insertion",
      targetIndex: null,
      transcriptIndex: originalTranscriptIndex,
      expected: null,
      actual: actualToken,
    });
    column -= 1;
  }

  const operations = reversed.reverse();
  for (const repetition of repetitionOperations) {
    const insertionIndex = operations.findIndex(
      ({ transcriptIndex }) => transcriptIndex !== null && transcriptIndex > repetition.transcriptIndex,
    );
    operations.splice(insertionIndex < 0 ? operations.length : insertionIndex, 0, repetition);
  }
  const C = operations.filter(({ op }) => op === "correct").length;
  const S = operations.filter(({ op }) => op === "substitution").length;
  const D = operations.filter(({ op }) => op === "deletion").length;
  const E = operations.filter(({ op }) => op === "insertion").length;
  const R = operations.filter(({ op }) => op === "repetition").length;

  return {
    expectedText: expectedTokens.join(" "),
    actualText: actualTokens.join(" "),
    expectedTokens,
    actualTokens,
    operations,
    N: expectedTokens.length,
    C,
    S,
    D,
    E,
    R,
    editDistance: S + D + E + R,
  };
}

function accuracyFromAlignment(alignment) {
  const denominator = alignment.C + alignment.S + alignment.E;
  return denominator === 0 ? 0 : roundScore((100 * alignment.C) / denominator);
}

function completenessFromAlignment(alignment) {
  return alignment.N === 0
    ? 0
    : roundScore((100 * (alignment.C + alignment.S)) / alignment.N);
}

function rateScore(wordsPerMinute) {
  if (wordsPerMinute >= 35 && wordsPerMinute <= 100) return 100;
  if (
    (wordsPerMinute >= 25 && wordsPerMinute < 35) ||
    (wordsPerMinute > 100 && wordsPerMinute <= 120)
  ) {
    return 90;
  }
  if (
    (wordsPerMinute >= 18 && wordsPerMinute < 25) ||
    (wordsPerMinute > 120 && wordsPerMinute <= 145)
  ) {
    return 75;
  }
  return 50;
}

function speechWindowSeconds(metrics, neutralWordCount) {
  if (Number.isFinite(Number(metrics.speechWindowSeconds))) {
    return Math.max(0, Number(metrics.speechWindowSeconds));
  }
  if (Number.isFinite(Number(metrics.speechWindowMs))) {
    return Math.max(0, Number(metrics.speechWindowMs) / 1000);
  }

  // A missing timing measurement is treated as neutral, not as evidence that
  // the learner spoke too fast or too slowly.
  return neutralWordCount > 0 ? neutralWordCount : 0;
}

function spokenWordCount(metrics, fallback) {
  return nonNegativeInteger(metrics.spokenWordCount, Math.max(0, fallback));
}

function commonFluencyParts({ metrics, wordCount, durationLimit, pauseScore, repetitionPenalty }) {
  const seconds = speechWindowSeconds(metrics, wordCount);
  const words = spokenWordCount(metrics, wordCount);
  const wordsPerMinute = seconds > 0 ? (words * 60) / seconds : 0;
  const suppliedRepetitions = Number(metrics.repetitions);
  const repetitions = Number.isFinite(suppliedRepetitions) && suppliedRepetitions >= 0
    ? Math.max(Math.floor(suppliedRepetitions), repetitionPenalty.detected)
    : repetitionPenalty.detected;
  const repetitionScore = Math.max(
    50,
    100 - Math.max(0, repetitions - 1) * repetitionPenalty.afterFirst,
  );
  const durationScore = Math.max(
    50,
    100 - Math.ceil(Math.max(0, seconds - durationLimit)) * 5,
  );
  const speedScore = rateScore(wordsPerMinute);
  const fluency = roundScore(
    pauseScore * 0.4 + speedScore * 0.3 + repetitionScore * 0.2 + durationScore * 0.1,
  );

  return {
    fluency,
    pauseScore: roundScore(pauseScore),
    speedScore,
    repetitionScore: roundScore(repetitionScore),
    durationScore: roundScore(durationScore),
    wordsPerMinute: Math.round(wordsPerMinute * 10) / 10,
    speechWindowSeconds: Math.round(seconds * 1000) / 1000,
    spokenWordCount: words,
    repetitions,
    durationLimitSeconds: durationLimit,
  };
}

function type1Fluency(alignment, metrics) {
  const mediumPauses = nonNegativeInteger(metrics.mediumPauses);
  const longPauses = nonNegativeInteger(metrics.longPauses);
  const freeMediumPauses = Math.ceil(alignment.N / 4);
  const pauseScore = Math.max(
    50,
    100 -
      Math.max(0, mediumPauses - freeMediumPauses) * 5 -
      Math.min(longPauses, 1) * 5 -
      Math.max(0, longPauses - 1) * 10,
  );
  const wordCount = Math.max(0, alignment.actualTokens.length - alignment.R);
  const result = commonFluencyParts({
    metrics,
    wordCount,
    durationLimit: 3 + alignment.N * 2,
    pauseScore,
    repetitionPenalty: { detected: alignment.R, afterFirst: 8 },
  });

  return {
    ...result,
    mediumPauses,
    longPauses,
    freeMediumPauses,
  };
}

function type2Fluency(answerAlignment, answerWordCount, metrics) {
  const mediumPauses = nonNegativeInteger(metrics.mediumPauses);
  const longPauses = nonNegativeInteger(metrics.longPauses);
  const freeMediumPauses = Math.ceil(answerWordCount / 3);
  const pauseScore = Math.max(
    50,
    100 -
      Math.max(0, mediumPauses - freeMediumPauses) * 5 -
      Math.max(0, longPauses - 1) * 8,
  );
  const detectedRepetitions = answerAlignment.R;
  const wordCount = Math.max(0, answerAlignment.actualTokens.length - detectedRepetitions);
  const durationLimit = 5 + answerWordCount * 2.5;
  const result = commonFluencyParts({
    metrics,
    wordCount,
    durationLimit,
    pauseScore,
    repetitionPenalty: { detected: detectedRepetitions, afterFirst: 6 },
  });

  return {
    ...result,
    mediumPauses,
    longPauses,
    freeMediumPauses,
  };
}

function normalizeQuestionType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["read_aloud", "type1", "1", "look_and_read"].includes(normalized)) return "read_aloud";
  if (["question_answer", "type2", "2", "read_and_answer"].includes(normalized)) {
    return "question_answer";
  }
  throw new TypeError(`Unsupported speaking question type: ${String(value)}`);
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function toSlotArray(value) {
  return Array.isArray(value) ? value.filter((slot) => slot !== null && slot !== undefined) : [];
}

function slotAlternatives(slot) {
  if (typeof slot === "string" || Array.isArray(slot)) {
    const tokens = equivalentTokens(slot);
    return tokens.length ? [tokens] : [];
  }
  if (!slot || typeof slot !== "object") return [];

  const rawAlternatives =
    slot.alternatives ??
    slot.accepted ??
    slot.acceptableValues ??
    slot.values ??
    slot.tokens ??
    slot.value ??
    slot.text ??
    slot.expected;

  if (Array.isArray(rawAlternatives)) {
    if (rawAlternatives.every((item) => typeof item === "string")) {
      // `tokens` represents one phrase; other array aliases represent choices.
      if (Array.isArray(slot.tokens) && rawAlternatives === slot.tokens) {
        const phrase = equivalentTokens(rawAlternatives);
        return phrase.length ? [phrase] : [];
      }
      return rawAlternatives.map((item) => equivalentTokens(item)).filter((tokens) => tokens.length);
    }
    return rawAlternatives.map((item) => equivalentTokens(item)).filter((tokens) => tokens.length);
  }

  const tokens = equivalentTokens(rawAlternatives);
  return tokens.length ? [tokens] : [];
}

function phraseOccurs(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((token, offset) => haystack[start + offset] === token)) return true;
  }
  return false;
}

function phraseTargetRanges(targetTokens, phraseTokens) {
  const ranges = [];
  if (!phraseTokens.length || phraseTokens.length > targetTokens.length) return ranges;
  for (let start = 0; start <= targetTokens.length - phraseTokens.length; start += 1) {
    if (phraseTokens.every((token, offset) => targetTokens[start + offset] === token)) {
      ranges.push(Array.from({ length: phraseTokens.length }, (_, offset) => start + offset));
    }
  }
  return ranges;
}

function slotStatus(slot, answerAlignment) {
  const alternatives = slotAlternatives(slot);
  const correct = alternatives.some((tokens) => phraseOccurs(answerAlignment.actualTokens, tokens));
  if (correct) return { correct: true, attempted: true };

  const operationByTargetIndex = new Map(
    answerAlignment.operations
      .filter(({ targetIndex }) => targetIndex !== null)
      .map((operation) => [operation.targetIndex, operation]),
  );
  const attempted = alternatives.some((tokens) =>
    phraseTargetRanges(answerAlignment.expectedTokens, tokens).some((range) =>
      range.every((targetIndex) => operationByTargetIndex.get(targetIndex)?.actual !== null),
    ),
  );
  return { correct: false, attempted };
}

function slotWeight(slot) {
  if (!slot || typeof slot !== "object") return null;
  const value = Number(slot.completenessWeight ?? slot.weight);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function completenessBySlots(coreSlots, structureSlots, coreStatuses, structureStatuses) {
  const allSlots = [...coreSlots, ...structureSlots];
  if (!allSlots.length) return null;

  const explicitWeights = allSlots.map(slotWeight);
  let weights;
  if (explicitWeights.every((weight) => weight !== null) && explicitWeights.some((weight) => weight > 0)) {
    const total = explicitWeights.reduce((sum, weight) => sum + weight, 0);
    weights = explicitWeights.map((weight) => (100 * weight) / total);
  } else if (!structureSlots.length) {
    weights = coreSlots.map(() => 100 / coreSlots.length);
  } else if (!coreSlots.length) {
    weights = structureSlots.map(() => 100 / structureSlots.length);
  } else {
    weights = [
      ...coreSlots.map(() => 50 / coreSlots.length),
      ...structureSlots.map(() => 50 / structureSlots.length),
    ];
  }

  const statuses = [...coreStatuses, ...structureStatuses];
  return roundScore(
    statuses.reduce((sum, status, index) => sum + (status.attempted ? weights[index] : 0), 0),
  );
}

function normalizeAnswerVariant(raw, index, question) {
  const source = typeof raw === "string" ? { text: raw } : raw ?? {};
  const text = firstString(source.text, source.answer, source.answerText, source.value);
  if (!text) throw new TypeError(`acceptableAnswers[${index}] is missing text`);

  const tokens = equivalentTokens(text);
  const answerWordCount = positiveNumber(
    source.answerWordCount ?? source.na ?? source.Na,
    tokens.length,
  );

  return {
    id: String(source.id ?? source.answerId ?? `${question.questionId ?? question.id ?? "answer"}-${index + 1}`),
    text,
    normalizedText: tokens.join(" "),
    tokens,
    answerKind: source.answerKind ?? "accepted",
    fullCredit: source.fullCredit !== false,
    answerWordCount,
    requiredContentSlots: toSlotArray(
      source.requiredContentSlots ?? source.coreSlots ?? question.requiredContentSlots,
    ),
    answerStructureSlots: toSlotArray(
      source.answerStructureSlots ?? source.structureSlots ?? question.answerStructureSlots,
    ),
    pronunciationAnalysis: source.pronunciationAnalysis ?? null,
    sourceIndex: index,
  };
}

function percentCorrect(statuses, fallback) {
  if (!statuses.length) return fallback;
  return roundScore((100 * statuses.filter(({ correct }) => correct).length) / statuses.length);
}

function evaluateAnswer(variant, answerTokens) {
  const alignment = alignWords(variant.tokens, answerTokens);
  const exactContent = alignment.S === 0 && alignment.D === 0 && alignment.E === 0;
  const exactFullCredit = exactContent && variant.fullCredit;
  const coreStatuses = variant.requiredContentSlots.map((slot) => slotStatus(slot, alignment));
  const structureStatuses = variant.answerStructureSlots.map((slot) => slotStatus(slot, alignment));
  const alignmentAccuracy = accuracyFromAlignment(alignment);
  const coreCorrectness = exactFullCredit
    ? 100
    : percentCorrect(coreStatuses, exactContent ? 100 : alignmentAccuracy);
  const structureCorrectness = exactFullCredit
    ? 100
    : percentCorrect(structureStatuses, alignmentAccuracy);
  const answerAccuracy = exactFullCredit
    ? 100
    : roundScore(coreCorrectness * 0.7 + structureCorrectness * 0.3);
  const fieldCompleteness = completenessBySlots(
    variant.requiredContentSlots,
    variant.answerStructureSlots,
    coreStatuses,
    structureStatuses,
  );
  const answerCompleteness = exactFullCredit
    ? 100
    : fieldCompleteness ?? completenessFromAlignment(alignment);
  const hasAnswer = answerTokens.length > 0;
  const coreCorrect =
    hasAnswer &&
    (exactFullCredit ||
      (coreStatuses.length > 0 && coreStatuses.every(({ correct }) => correct)));

  return {
    alignment,
    exactContent,
    exactFullCredit,
    coreStatuses,
    structureStatuses,
    coreCorrectness,
    structureCorrectness,
    answerAccuracy,
    answerCompleteness,
    coreCorrect,
  };
}

function compareAnswerCandidates(left, right) {
  const leftKey = [
    left.answer.exactFullCredit ? 0 : 1,
    left.distance,
    -left.answer.alignment.C,
    left.variant.sourceIndex,
  ];
  const rightKey = [
    right.answer.exactFullCredit ? 0 : 1,
    right.distance,
    -right.answer.alignment.C,
    right.variant.sourceIndex,
  ];

  for (let index = 0; index < leftKey.length; index += 1) {
    if (leftKey[index] !== rightKey[index]) return leftKey[index] - rightKey[index];
  }
  return 0;
}

function chooseQuestionAnswerAlignment(variants, transcript, metrics) {
  const explicitAnswer = firstString(metrics.answerTranscript, metrics.segments?.answer);
  const answerTokens = tokenize(explicitAnswer || transcript);
  const candidates = variants.map((variant) => {
    const answer = evaluateAnswer(variant, answerTokens);
    return {
      variant,
      answerTokens,
      answer,
      distance: answer.alignment.editDistance,
      explicitAnswer: Boolean(explicitAnswer),
    };
  });

  candidates.sort(compareAnswerCandidates);
  return candidates[0];
}

function analysisTextList(value) {
  return toSlotArray(value)
    .map((item) =>
      typeof item === "string"
        ? item
        : firstString(item?.word, item?.text, item?.value, item?.label),
    )
    .filter(Boolean);
}

function analysisReferences(question, matchedAnswer) {
  const nested = matchedAnswer?.pronunciationAnalysis ?? question.pronunciationAnalysis ?? {};
  const intonation = nested.intonationReport ?? question.intonationReport ?? {};
  return {
    pronunciationTargets: analysisTextList(
      nested.pronunciationTargets ?? question.pronunciationTargets,
    ),
    difficultWords: analysisTextList(nested.difficultWords ?? question.difficultWords),
    stressWords: analysisTextList(
      nested.stressWords ?? intonation.stressWords ?? question.stressWords,
    ),
    tone: nested.tone ?? intonation.tone ?? question.tone ?? null,
    chunks: analysisTextList(nested.chunks ?? intonation.chunks ?? question.chunks),
    linking: analysisTextList(nested.linking ?? intonation.linking ?? question.linking),
    studentReminder: firstString(nested.studentReminder, nested.studentReminderExample),
  };
}

function firstOperation(alignment, operation) {
  return alignment?.operations?.find(({ op }) => op === operation) ?? null;
}

function choosePrimaryIssue({
  valid,
  type,
  coreCorrect,
  alignment,
  fluencyDetails,
  passed,
}) {
  if (!valid) return "invalid_transcript";
  if (!coreCorrect) return "wrong_core";

  const alignments = type === "question_answer"
    ? [alignment.answer]
    : [alignment];
  if (alignments.some((item) => item.D > 0)) return "missing_target";
  if (alignments.some((item) => item.S > 0)) return "wrong_target";
  if (fluencyDetails.repetitions > 1) return "repetition";
  if (
    fluencyDetails.mediumPauses > fluencyDetails.freeMediumPauses ||
    (type === "read_aloud" && fluencyDetails.longPauses > 0) ||
    (type === "question_answer" && fluencyDetails.longPauses > 1)
  ) {
    return "long_pause";
  }
  if (fluencyDetails.fluency < 90) return "fluency";
  return passed ? "achieved" : "retry";
}

function buildFeedback({ primaryIssue, alignment, type, modelPhrase, references }) {
  const alignments = type === "question_answer"
    ? [alignment.answer]
    : [alignment];
  const deleted = alignments.map((item) => firstOperation(item, "deletion")).find(Boolean);
  const substituted = alignments.map((item) => firstOperation(item, "substitution")).find(Boolean);
  const repeated = alignments.map((item) => firstOperation(item, "repetition")).find(Boolean);

  switch (primaryIssue) {
    case "invalid_transcript":
      return "我沒有聽清楚。請靠近麥克風，再說一次吧！";
    case "wrong_core":
      return `你有勇敢回答！再看看圖片，可以說：${modelPhrase}`;
    case "missing_target":
      return `你已經說得很接近了！記得把 ${deleted?.expected ?? "漏掉的字"} 也說出來。`;
    case "wrong_target":
      return `你有把內容說出來！再聽一次並模仿 ${substituted?.expected ?? references.pronunciationTargets[0] ?? modelPhrase}。`;
    case "repetition":
      return `你的聲音很清楚！${repeated?.actual ?? "這個字"} 說一次就可以了。`;
    case "long_pause":
      return `你有努力把內容說完！下一次先練這一小段：${references.chunks[0] ?? modelPhrase}`;
    case "fluency":
      return `你有把內容說對！下一次試著把 ${references.linking[0] ?? references.chunks[0] ?? modelPhrase} 順順說出來。`;
    case "achieved":
      return references.studentReminder ||
        `你說對也說完整了，很棒！再清楚說出 ${references.stressWords[0] ?? modelPhrase}。`;
    default:
      return `再試一次，你一定可以說得更完整！可以模仿：${modelPhrase}`;
  }
}

function invalidResult(type, question, passScore, transcriptState) {
  const state = transcriptState ?? canonicalizeTranscriptForQuestion(question, "");
  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type,
    rawTranscript: state.rawTranscript,
    canonicalTranscript: state.canonicalTranscript,
    displayTranscript: state.displayTranscript,
    canonicalizationProfile: state.profile,
    invalidReason: state.invalidReason,
    systemLike: state.systemLike,
    scores: { accuracy: null, completeness: null, fluency: null, total: null },
    passed: false,
    passScore,
    coreCorrect: false,
    valid: false,
    feedback: "我沒有聽清楚。請靠近麥克風，再說一次吧！",
    primaryIssue: "invalid_transcript",
    alignment: null,
    matchedAnswer: null,
    scoringScope: SCORING_SCOPE,
  };
}

export function scoreReadAloud({ question, transcript, metrics = {} }) {
  const passScore = positiveNumber(question.passScore, DEFAULT_PASS_SCORE);
  const targetText = firstString(
    question.standardReadSentence,
    question.targetText,
    question.sentence,
  );
  if (!targetText) throw new TypeError("read_aloud question is missing standardReadSentence");

  const transcriptState = canonicalizeTranscriptForQuestion(question, transcript);
  if (!transcriptState.valid) {
    return invalidResult("read_aloud", question, passScore, transcriptState);
  }

  const alignment = alignWords(targetText, transcriptState.canonicalTranscript);
  const accuracy = accuracyFromAlignment(alignment);
  const completeness = completenessFromAlignment(alignment);
  const fluencyDetails = type1Fluency(alignment, metrics);
  const uncappedTotal = roundScore(
    accuracy * 0.5 + completeness * 0.3 + fluencyDetails.fluency * 0.2,
  );
  const coreCorrect = clockCoreCorrect(question, transcriptState, targetText);
  const total = coreCorrect ? uncappedTotal : Math.min(59, uncappedTotal);
  const passed = total >= passScore && coreCorrect;
  const references = analysisReferences(question, null);
  const primaryIssue = choosePrimaryIssue({
    valid: true,
    type: "read_aloud",
    coreCorrect,
    alignment,
    fluencyDetails,
    passed,
  });

  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type: "read_aloud",
    rawTranscript: transcriptState.rawTranscript,
    canonicalTranscript: transcriptState.canonicalTranscript,
    displayTranscript: transcriptState.displayTranscript,
    canonicalizationProfile: transcriptState.profile,
    normalizedTranscript: normalizeText(transcriptState.canonicalTranscript),
    scores: {
      accuracy,
      completeness,
      fluency: fluencyDetails.fluency,
      total,
    },
    passed,
    passScore,
    coreCorrect,
    valid: true,
    feedback: buildFeedback({
      primaryIssue,
      alignment,
      type: "read_aloud",
      modelPhrase: targetText,
      references,
    }),
    primaryIssue,
    alignment,
    matchedAnswer: null,
    components: {
      uncappedTotal,
      clockCoreCorrect: coreCorrect,
      coreScoreCapApplied: !coreCorrect && uncappedTotal > 59,
    },
    fluencyDetails,
    feedbackReferences: references,
    scoringScope: SCORING_SCOPE,
  };
}

export function scoreQuestionAnswer({ question, transcript, metrics = {} }) {
  const passScore = positiveNumber(question.passScore, DEFAULT_PASS_SCORE);
  const questionText = firstString(question.questionText, question.prompt);
  if (!questionText) throw new TypeError("question_answer question is missing questionText");

  const rawAnswers = Array.isArray(question.acceptableAnswers) ? question.acceptableAnswers : [];
  if (!rawAnswers.length) {
    throw new TypeError("question_answer question must include acceptableAnswers");
  }
  const variants = rawAnswers.map((answer, index) => normalizeAnswerVariant(answer, index, question));
  const answerTranscript = firstString(metrics.answerTranscript, metrics.segments?.answer, transcript);
  const transcriptState = canonicalizeTranscriptForQuestion(question, answerTranscript);
  if (!transcriptState.valid) {
    return invalidResult("question_answer", question, passScore, transcriptState);
  }

  const scoringMetrics = {
    ...metrics,
    answerTranscript: transcriptState.canonicalTranscript,
    segments: {
      ...(metrics.segments && typeof metrics.segments === "object" ? metrics.segments : {}),
      answer: transcriptState.canonicalTranscript,
    },
  };
  const selected = chooseQuestionAnswerAlignment(
    variants,
    transcriptState.canonicalTranscript,
    scoringMetrics,
  );
  const accuracy = selected.answer.answerAccuracy;
  const completeness = selected.answer.answerCompleteness;
  const fluencyDetails = type2Fluency(
    selected.answer.alignment,
    selected.variant.answerWordCount,
    metrics,
  );
  const uncappedTotal = roundScore(
    accuracy * 0.5 + completeness * 0.3 + fluencyDetails.fluency * 0.2,
  );
  const timeCoreCorrect = clockCoreCorrect(
    question,
    transcriptState,
    selected.variant.text,
  );
  const coreCorrect = selected.answer.coreCorrect && timeCoreCorrect;
  const total = coreCorrect ? uncappedTotal : Math.min(59, uncappedTotal);
  const passed = total >= passScore && coreCorrect;
  const alignment = { answer: selected.answer.alignment };
  const references = analysisReferences(question, selected.variant);
  const primaryIssue = choosePrimaryIssue({
    valid: true,
    type: "question_answer",
    coreCorrect,
    alignment,
    fluencyDetails,
    passed,
  });
  const matchedAnswer = {
    id: selected.variant.id,
    text: selected.variant.text,
    normalizedText: selected.variant.normalizedText,
    answerKind: selected.variant.answerKind,
    fullCredit: selected.variant.fullCredit,
    answerWordCount: selected.variant.answerWordCount,
    exactContent: selected.answer.exactContent,
    coreCorrectness: selected.answer.coreCorrectness,
    structureCorrectness: selected.answer.structureCorrectness,
    answerAccuracy: accuracy,
    answerCompleteness: completeness,
  };

  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type: "question_answer",
    rawTranscript: transcriptState.rawTranscript,
    canonicalTranscript: transcriptState.canonicalTranscript,
    displayTranscript: transcriptState.displayTranscript,
    canonicalizationProfile: transcriptState.profile,
    normalizedTranscript: normalizeText(transcriptState.canonicalTranscript),
    segments: { answer: selected.answerTokens.join(" ") },
    scores: {
      accuracy,
      completeness,
      fluency: fluencyDetails.fluency,
      total,
    },
    passed,
    passScore,
    coreCorrect,
    valid: true,
    feedback: buildFeedback({
      primaryIssue,
      alignment,
      type: "question_answer",
      modelPhrase: selected.variant.text,
      references,
    }),
    primaryIssue,
    alignment,
    matchedAnswer,
    components: {
      answerAccuracy: accuracy,
      answerCompleteness: completeness,
      uncappedTotal,
      clockCoreCorrect: timeCoreCorrect,
      coreScoreCapApplied: !coreCorrect && uncappedTotal > 59,
    },
    fluencyDetails,
    feedbackReferences: references,
    scoringScope: SCORING_SCOPE,
  };
}

/** Fixed public entry point used by the Cloud Function layer. */
export function scoreSpeechAttempt({ question, transcript, metrics = {} }) {
  if (!question || typeof question !== "object") {
    throw new TypeError("scoreSpeechAttempt requires a question object");
  }
  const type = normalizeQuestionType(question.type ?? question.questionType);
  if (type === "read_aloud") return scoreReadAloud({ question, transcript, metrics });
  return scoreQuestionAnswer({ question, transcript, metrics });
}
