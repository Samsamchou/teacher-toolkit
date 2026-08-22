import { createHash } from "node:crypto";

export const READY_UNIT_ID = "hwg7-sr";
export const QUESTION_TYPES = Object.freeze({
  READ_ALOUD: "read_aloud",
  QUESTION_ANSWER: "question_answer",
});
export const ACTIVE_GAME_MS = 45 * 60 * 1000;

export class DomainValidationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "DomainValidationError";
    this.code = code;
    this.status = status;
  }
}

function requiredString(value, code, message) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new DomainValidationError(code, message);
  return normalized;
}

export function validateUnitId(value) {
  const unitId = requiredString(value, "unit_required", "請先選擇練習單元。");
  if (unitId !== READY_UNIT_ID) {
    throw new DomainValidationError("unit_not_ready", "這個單元題庫準備中，暫時不能開始。", 409);
  }
  return unitId;
}

export function validateStudentCodes(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new DomainValidationError("two_students_required", "請輸入兩位學生的五碼代碼。");
  }
  const students = value.map((item) => requiredString(item, "student_code_required", "學生代碼不能空白。"));
  if (!students.every((code) => /^\d{5}$/u.test(code))) {
    throw new DomainValidationError("invalid_student_code", "學生代碼必須是五碼班級加座號。");
  }
  if (students[0] === students[1]) {
    throw new DomainValidationError("duplicate_student_code", "兩位玩家不可使用相同代碼。");
  }
  return students;
}

export function taipeiDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("taipeiDate requires a valid date");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function pairRotationId({ unitId, date, students }) {
  const validUnit = validateUnitId(unitId);
  const validStudents = validateStudentCodes(students);
  const validDate = /^\d{4}-\d{2}-\d{2}$/u.test(String(date || "")) ? String(date) : taipeiDate(date);
  const canonical = [validUnit, validDate, ...[...validStudents].sort()].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function assignmentForCompletedCount(students, completedGameCount = 0) {
  const [studentA, studentB] = validateStudentCodes(students);
  const completed = Number.isInteger(completedGameCount) && completedGameCount >= 0 ? completedGameCount : 0;
  const aStartsWithReadAloud = completed % 2 === 0;
  return {
    phase: aStartsWithReadAloud ? "a_type1_b_type2" : "a_type2_b_type1",
    firstTurnType: aStartsWithReadAloud ? QUESTION_TYPES.READ_ALOUD : QUESTION_TYPES.QUESTION_ANSWER,
    players: {
      A: { studentCode: studentA, inputPosition: 1, questionType: aStartsWithReadAloud ? QUESTION_TYPES.READ_ALOUD : QUESTION_TYPES.QUESTION_ANSWER },
      B: { studentCode: studentB, inputPosition: 2, questionType: aStartsWithReadAloud ? QUESTION_TYPES.QUESTION_ANSWER : QUESTION_TYPES.READ_ALOUD },
    },
  };
}

export function decideGameStart({ rotation = null, students, unitId, now = new Date(), requestId }) {
  const validStudents = validateStudentCodes(students);
  const validUnit = validateUnitId(unitId);
  const clientRequestId = requiredString(requestId, "request_id_required", "缺少安全開局識別碼。");
  if (clientRequestId.length > 120) throw new DomainValidationError("request_id_too_long", "開局識別碼格式不正確。");
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError("decideGameStart requires a valid now value");
  const current = rotation && typeof rotation === "object" ? rotation : {};
  const activeUntilMs = current.activeUntil ? new Date(current.activeUntil).getTime() : 0;

  if (current.activeGameId && activeUntilMs > nowMs) {
    if (current.activeRequestId === clientRequestId && current.activeStudents?.join("|") === validStudents.join("|")) {
      return {
        action: "resume",
        gameSessionId: current.activeGameId,
        assignment: current.activeAssignment,
        activeUntil: current.activeUntil,
      };
    }
    throw new DomainValidationError(
      "game_already_active",
      "這組學生目前已有進行中的遊戲，請先完成該局或等待逾時。",
      409,
    );
  }

  const completedGameCount = Number.isInteger(current.completedGameCount) && current.completedGameCount >= 0
    ? current.completedGameCount
    : 0;
  const assignment = assignmentForCompletedCount(validStudents, completedGameCount);
  return {
    action: "create",
    unitId: validUnit,
    students: validStudents,
    requestId: clientRequestId,
    completedGameCount,
    assignment,
    activeUntil: new Date(nowMs + ACTIVE_GAME_MS).toISOString(),
  };
}

export function decideGameCompletion({ session, rotation }) {
  if (!session || typeof session !== "object") {
    throw new DomainValidationError("game_not_found", "找不到這一局遊戲。", 404);
  }
  if (session.status === "completed") {
    return { action: "already_completed", flip: false, completedGameCount: rotation?.completedGameCount ?? null };
  }
  if (session.status !== "active") {
    throw new DomainValidationError("game_not_active", "這一局已失效，不能更新輪替。", 409);
  }
  if (!rotation || rotation.activeGameId !== session.id) {
    throw new DomainValidationError("rotation_mismatch", "遊戲輪替狀態不一致，請回首頁重新開始。", 409);
  }
  const completedGameCount = (Number.isInteger(rotation.completedGameCount) ? rotation.completedGameCount : 0) + 1;
  return { action: "complete", flip: true, completedGameCount };
}

export function validateCompletionSummary(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainValidationError("result_required", "缺少完整遊戲結果。");
  }
  const turnSummaries = Array.isArray(value.turnSummaries) ? value.turnSummaries : [];
  if (turnSummaries.length !== 12) {
    throw new DomainValidationError("incomplete_game", "只有完整完成 12 回合的遊戲才會翻轉下一局題型。", 409);
  }
  const indexes = turnSummaries.map((turn) => Number(turn?.turnIndex));
  if (new Set(indexes).size !== 12 || !indexes.every((index) => Number.isInteger(index) && index >= 0 && index < 12)) {
    throw new DomainValidationError("invalid_turn_summary", "遊戲回合資料不完整。");
  }
  return {
    scores: value.scores && typeof value.scores === "object" ? value.scores : {},
    turnSummaries: turnSummaries.map((turn) => {
      const questionId = requiredString(turn.questionId, "question_id_required", "回合缺少題目代碼。");
      const studentCode = requiredString(turn.studentCode, "student_code_required", "回合缺少學生代碼。");
      const questionType = requiredString(turn.questionType, "question_type_required", "回合缺少題型。");
      const status = requiredString(turn.status, "turn_status_required", "回合缺少達標狀態。");
      const bestScore = Number(turn.bestScore);
      const attemptIds = Array.isArray(turn.attemptIds) ? turn.attemptIds.map(String) : [];
      if (!/^HWG7-SR-\d{3}$/u.test(questionId)) throw new DomainValidationError("invalid_question_id", "回合題目代碼格式不正確。");
      if (!/^\d{5}$/u.test(studentCode)) throw new DomainValidationError("invalid_student_code", "回合學生代碼格式不正確。");
      if (![QUESTION_TYPES.READ_ALOUD, QUESTION_TYPES.QUESTION_ANSWER].includes(questionType)) throw new DomainValidationError("invalid_question_type", "回合題型不正確。");
      if (!["passed", "not_met"].includes(status)) throw new DomainValidationError("invalid_turn_status", "回合達標狀態不正確。");
      if (!Number.isFinite(bestScore) || bestScore < 0 || bestScore > 100) throw new DomainValidationError("invalid_best_score", "回合最佳分數不正確。");
      if (attemptIds.length < 1 || attemptIds.length > 3 || attemptIds.some((id) => !/^[A-Za-z0-9_-]{10,180}$/u.test(id))) {
        throw new DomainValidationError("invalid_attempt_ids", "每回合必須包含一至三筆有效評測紀錄。");
      }
      return { turnIndex: Number(turn.turnIndex), questionId, studentCode, questionType, status, bestScore, attemptIds };
    }),
  };
}