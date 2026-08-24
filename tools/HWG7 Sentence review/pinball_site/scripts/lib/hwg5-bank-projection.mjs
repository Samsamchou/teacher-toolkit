const PRIVATE_KEYS = new Set([
  "acceptableAnswers",
  "requiredContentSlots",
  "answerStructureSlots",
  "requiredCorePhrases",
  "pronunciationAnalysis",
  "scoringPolicy",
  "transcriptCanonicalization",
  "transcriptCanonicalizer",
]);

export function projectHwg5PublicQuestion(question) {
  return {
    id: question.id,
    displayOrder: question.displayOrder,
    type: question.type,
    typeLabel: question.typeLabel,
    unit: question.unit,
    unitId: question.unitId,
    questionBankVersion: question.questionBankVersion,
    rubricVersion: question.rubricVersion,
    passScore: question.passScore,
    maxAttempts: question.maxAttempts,
    image: {
      path: question.image?.path ?? "",
      alt: question.image?.alt ?? "",
      altReviewStatus: question.image?.altReviewStatus ?? "",
      generationStatus: question.image?.generationStatus ?? "",
    },
    questionText: question.questionText ?? "",
    prompt: question.questionText || question.standardReadSentence || "",
    standardReadSentence: question.standardReadSentence ?? "",
    answerPromptStructure: question.answerPromptStructure ?? "",
    tts: {
      provider: question.tts?.provider ?? "",
      model: question.tts?.model ?? "",
      voice: question.tts?.voice ?? "",
      speed: question.tts?.speed ?? null,
      text: question.tts?.text ?? "",
      path: question.tts?.path ?? "",
      disclosure: question.tts?.disclosure ?? "",
      generationStatus: question.tts?.generationStatus ?? "",
    },
    ttsText: question.tts?.text ?? "",
    ttsAudio: question.tts?.path ?? "",
  };
}

export function projectHwg5PublicBank(bank) {
  if (!Array.isArray(bank?.questions)) throw new TypeError("HWG5 bank questions must be an array.");
  return bank.questions.map(projectHwg5PublicQuestion);
}

export function findPrivatePublicKeys(value, path = "$", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findPrivatePublicKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEYS.has(key)) findings.push(`${path}.${key}`);
    findPrivatePublicKeys(child, `${path}.${key}`, findings);
  }
  return findings;
}
