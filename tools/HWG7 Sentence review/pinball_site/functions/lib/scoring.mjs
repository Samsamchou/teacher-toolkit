/**
 * Deterministic A1 speaking-practice scoring.
 *
 * This module scores transcript text and caller-supplied timing metrics. It is
 * not a phoneme or standardized pronunciation assessment. Stress, intonation,
 * chunks, and linking are used only as feedback references.
 */

export const RUBRIC_VERSION = "a1-v1";
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

export function tokenize(value) {
  if (Array.isArray(value)) {
    return value.flatMap((token) => tokenize(token));
  }

  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
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
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);
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

function type2Fluency(questionAlignment, answerAlignment, answerWordCount, metrics) {
  const mediumPauses = nonNegativeInteger(metrics.mediumPauses);
  const longPauses = nonNegativeInteger(metrics.longPauses);
  const freeMediumPauses =
    Math.ceil(questionAlignment.N / 4) + Math.ceil(answerWordCount / 3);
  const pauseScore = Math.max(
    50,
    100 -
      Math.max(0, mediumPauses - freeMediumPauses) * 5 -
      Math.max(0, longPauses - 1) * 8,
  );
  const detectedRepetitions = questionAlignment.R + answerAlignment.R;
  const wordCount = Math.max(
    0,
    questionAlignment.actualTokens.length +
      answerAlignment.actualTokens.length -
      detectedRepetitions,
  );
  const durationLimit =
    3 + questionAlignment.N * 2 + (5 + answerWordCount * 2.5);
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
    transitionPauseRule: "first_under_4_seconds_excluded_by_caller",
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
    const tokens = tokenize(slot);
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
        const phrase = tokenize(rawAlternatives);
        return phrase.length ? [phrase] : [];
      }
      return rawAlternatives.map((item) => tokenize(item)).filter((tokens) => tokens.length);
    }
    return rawAlternatives.map((item) => tokenize(item)).filter((tokens) => tokens.length);
  }

  const tokens = tokenize(rawAlternatives);
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

  const tokens = tokenize(text);
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

function compareCandidates(left, right, expectedQuestionLength) {
  const leftKey = [
    left.distance,
    left.answer.exactFullCredit ? 0 : 1,
    -left.questionAlignment.C,
    -left.answer.alignment.C,
    Math.abs(left.splitIndex - expectedQuestionLength),
    left.variant.sourceIndex,
    left.splitIndex,
  ];
  const rightKey = [
    right.distance,
    right.answer.exactFullCredit ? 0 : 1,
    -right.questionAlignment.C,
    -right.answer.alignment.C,
    Math.abs(right.splitIndex - expectedQuestionLength),
    right.variant.sourceIndex,
    right.splitIndex,
  ];

  for (let index = 0; index < leftKey.length; index += 1) {
    if (leftKey[index] !== rightKey[index]) return leftKey[index] - rightKey[index];
  }
  return 0;
}

function chooseQuestionAnswerAlignment(questionText, variants, transcript, metrics) {
  const questionTokens = tokenize(questionText);
  const combinedTokens = tokenize(transcript);
  const explicitQuestion = firstString(
    metrics.questionTranscript,
    metrics.segments?.question,
  );
  const explicitAnswer = firstString(metrics.answerTranscript, metrics.segments?.answer);
  const candidates = [];

  if (explicitQuestion || explicitAnswer) {
    const questionSegment = tokenize(explicitQuestion);
    const answerSegment = tokenize(explicitAnswer);
    for (const variant of variants) {
      const questionAlignment = alignWords(questionTokens, questionSegment);
      const answer = evaluateAnswer(variant, answerSegment);
      candidates.push({
        variant,
        questionTokens: questionSegment,
        answerTokens: answerSegment,
        questionAlignment,
        answer,
        distance: questionAlignment.editDistance + answer.alignment.editDistance,
        splitIndex: questionSegment.length,
        explicitSegments: true,
      });
    }
  } else {
    for (let splitIndex = 0; splitIndex <= combinedTokens.length; splitIndex += 1) {
      const questionSegment = combinedTokens.slice(0, splitIndex);
      const answerSegment = combinedTokens.slice(splitIndex);
      const questionAlignment = alignWords(questionTokens, questionSegment);
      for (const variant of variants) {
        const answer = evaluateAnswer(variant, answerSegment);
        candidates.push({
          variant,
          questionTokens: questionSegment,
          answerTokens: answerSegment,
          questionAlignment,
          answer,
          distance: questionAlignment.editDistance + answer.alignment.editDistance,
          splitIndex,
          explicitSegments: false,
        });
      }
    }
  }

  candidates.sort((left, right) => compareCandidates(left, right, questionTokens.length));
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
  if (type === "question_answer" && !coreCorrect) return "wrong_core";

  const alignments = type === "question_answer"
    ? [alignment.question, alignment.answer]
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
    ? [alignment.answer, alignment.question]
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

function invalidResult(type, question, passScore) {
  const modelPhrase =
    type === "read_aloud"
      ? firstString(question.standardReadSentence, question.targetText, question.sentence)
      : firstString(question.acceptableAnswers?.[0]?.text, question.acceptableAnswers?.[0]);
  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type,
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
    modelPhrase,
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
  if (!normalizeText(transcript)) return invalidResult("read_aloud", question, passScore);

  const alignment = alignWords(targetText, transcript);
  const accuracy = accuracyFromAlignment(alignment);
  const completeness = completenessFromAlignment(alignment);
  const fluencyDetails = type1Fluency(alignment, metrics);
  const total = roundScore(
    accuracy * 0.4 + completeness * 0.35 + fluencyDetails.fluency * 0.25,
  );
  const passed = total >= passScore;
  const references = analysisReferences(question, null);
  const primaryIssue = choosePrimaryIssue({
    valid: true,
    type: "read_aloud",
    coreCorrect: true,
    alignment,
    fluencyDetails,
    passed,
  });

  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type: "read_aloud",
    normalizedTranscript: normalizeText(transcript),
    scores: {
      accuracy,
      completeness,
      fluency: fluencyDetails.fluency,
      total,
    },
    passed,
    passScore,
    coreCorrect: true,
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
  if (!normalizeText(transcript) && !firstString(metrics.questionTranscript, metrics.answerTranscript)) {
    return invalidResult("question_answer", question, passScore);
  }

  const selected = chooseQuestionAnswerAlignment(questionText, variants, transcript, metrics);
  const questionAccuracy = accuracyFromAlignment(selected.questionAlignment);
  const questionCompleteness = completenessFromAlignment(selected.questionAlignment);
  const answerAccuracy = selected.answer.answerAccuracy;
  const answerCompleteness = selected.answer.answerCompleteness;
  const accuracy = roundScore(questionAccuracy * 0.3 + answerAccuracy * 0.7);
  const completeness = roundScore(questionCompleteness * 0.3 + answerCompleteness * 0.7);
  const fluencyDetails = type2Fluency(
    selected.questionAlignment,
    selected.answer.alignment,
    selected.variant.answerWordCount,
    metrics,
  );
  const uncappedTotal = roundScore(
    accuracy * 0.5 + completeness * 0.3 + fluencyDetails.fluency * 0.2,
  );
  const coreCorrect = selected.answer.coreCorrect;
  const total = coreCorrect ? uncappedTotal : Math.min(59, uncappedTotal);
  const passed = total >= passScore && coreCorrect;
  const alignment = {
    question: selected.questionAlignment,
    answer: selected.answer.alignment,
    splitIndex: selected.splitIndex,
    explicitSegments: selected.explicitSegments,
  };
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
    answerAccuracy,
    answerCompleteness,
  };

  return {
    rubricVersion: question.rubricVersion ?? RUBRIC_VERSION,
    type: "question_answer",
    normalizedTranscript: normalizeText(transcript),
    segments: {
      question: selected.questionTokens.join(" "),
      answer: selected.answerTokens.join(" "),
    },
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
      questionAccuracy,
      questionCompleteness,
      answerAccuracy,
      answerCompleteness,
      uncappedTotal,
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
