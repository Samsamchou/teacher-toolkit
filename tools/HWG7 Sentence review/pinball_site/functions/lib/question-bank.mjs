const QUESTION_TYPES = new Set(["read_aloud", "question_answer"]);

export const QUESTION_ID_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/u;

function requiredString(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new TypeError(`Question bank is missing ${label}.`);
  return normalized;
}

function sourceUnits(bankDocument) {
  if (!bankDocument || typeof bankDocument !== "object" || Array.isArray(bankDocument)) {
    throw new TypeError("Deployable question bank must be an object.");
  }
  if (Array.isArray(bankDocument.units)) return bankDocument.units;
  return [bankDocument];
}

/**
 * Build a strict unit-aware registry. A legacy one-unit document remains
 * readable, but every deployable question must declare the same unit and bank
 * version as its enclosing unit.
 */
export function buildQuestionBankRegistry(bankDocument) {
  const units = sourceUnits(bankDocument);
  if (!units.length) throw new TypeError("Deployable question bank has no units.");

  const unitMap = new Map();
  const questionMap = new Map();

  for (const source of units) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new TypeError("Each deployable unit must be an object.");
    }
    const unitId = requiredString(source.unitId ?? source.mode?.unitId, "unitId");
    const questionBankVersion = requiredString(
      source.questionBankVersion ?? source.mode?.questionBankVersion,
      `${unitId}.questionBankVersion`,
    );
    if (unitMap.has(unitId)) throw new TypeError(`Duplicate deployable unit: ${unitId}`);

    const questions = Array.isArray(source.questions) ? source.questions : [];
    if (questions.length < 12) {
      throw new TypeError(`Deployable unit ${unitId} must contain at least 12 questions.`);
    }

    const localIds = new Set();
    const typeCounts = { read_aloud: 0, question_answer: 0 };
    for (const question of questions) {
      const id = requiredString(question?.id, `${unitId}.question.id`);
      if (!QUESTION_ID_PATTERN.test(id)) throw new TypeError(`Invalid question ID: ${id}`);
      if (localIds.has(id) || questionMap.has(id)) throw new TypeError(`Duplicate question ID: ${id}`);
      if (question.unitId !== unitId) {
        throw new TypeError(`Question ${id} unitId does not match ${unitId}.`);
      }
      if (question.questionBankVersion !== questionBankVersion) {
        throw new TypeError(`Question ${id} bank version does not match ${questionBankVersion}.`);
      }
      if (!QUESTION_TYPES.has(question.type)) {
        throw new TypeError(`Question ${id} has an unsupported type.`);
      }
      if (question.passScore !== 80) {
        throw new TypeError(`Question ${id} must use passScore 80.`);
      }

      localIds.add(id);
      typeCounts[question.type] += 1;
      questionMap.set(id, question);
    }

    if (typeCounts.read_aloud < 6 || typeCounts.question_answer < 6) {
      throw new TypeError(`Deployable unit ${unitId} needs at least six questions of each type.`);
    }

    unitMap.set(unitId, {
      unitId,
      questionBankVersion,
      schemaVersion: source.schemaVersion ?? bankDocument.schemaVersion ?? null,
      mode: source.mode ?? {},
      game: source.game ?? {},
      rubric: source.rubric ?? {},
      questions,
      questionIds: localIds,
      typeCounts,
    });
  }

  return {
    unitMap,
    questionMap,
    units: [...unitMap.values()],
    questions: [...questionMap.values()],
  };
}
