const STORAGE_KEY = "ershui-english-mission-attempts-v1";
const ACTIVE_KEY = "ershui-english-mission-active-v1";

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createAttempt(studentId, contentVersion) {
  const now = new Date().toISOString();
  const attempt = {
    attemptId: makeId(),
    studentId,
    contentVersion,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    lastSeenAt: now,
    lastSyncedAt: null,
    syncMode: "local_mock",
    energy: 50,
    currentNodeIndex: 0,
    missionIntroSeen: [],
    unlockedItems: [],
    answers: {},
  };
  const attempts = listAttempts();
  attempts.push(attempt);
  writeJson(STORAGE_KEY, attempts);
  localStorage.setItem(ACTIVE_KEY, attempt.attemptId);
  return attempt;
}

export function listAttempts() {
  const value = readJson(STORAGE_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function getAttempt(attemptId) {
  return listAttempts().find((attempt) => attempt.attemptId === attemptId) ?? null;
}

export function getActiveAttempt() {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  const attempt = getAttempt(id);
  return attempt?.status === "in_progress" ? attempt : null;
}

export function setActiveAttempt(attemptId) {
  if (attemptId) localStorage.setItem(ACTIVE_KEY, attemptId);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function saveAttempt(attempt) {
  const attempts = listAttempts();
  const index = attempts.findIndex((item) => item.attemptId === attempt.attemptId);
  const next = { ...attempt, lastSeenAt: new Date().toISOString() };
  if (index >= 0) attempts[index] = next;
  else attempts.push(next);
  writeJson(STORAGE_KEY, attempts);
  if (next.status === "in_progress") localStorage.setItem(ACTIVE_KEY, next.attemptId);
  return next;
}

export function summarizeAttempts(attempts) {
  const completed = attempts.filter((item) => item.status === "completed");
  const answerRows = attempts.flatMap((attempt) => Object.values(attempt.answers ?? {}));
  const firstTry = answerRows.filter((row) => row.firstTryCorrect).length;
  const finalCorrect = answerRows.filter((row) => row.finalCorrect).length;
  return {
    attempts: attempts.length,
    completed: completed.length,
    completionRate: attempts.length ? Math.round((completed.length / attempts.length) * 100) : 0,
    answerRows: answerRows.length,
    firstTryRate: answerRows.length ? Math.round((firstTry / answerRows.length) * 100) : 0,
    finalCorrectRate: answerRows.length ? Math.round((finalCorrect / answerRows.length) * 100) : 0,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function attemptsToCsv(attempts) {
  const header = ["attemptId", "studentId", "status", "startedAt", "completedAt", "energy", "mainCorrect", "requiredNodes", "firstTryCorrect"];
  const rows = attempts.map((attempt) => {
    const answers = Object.values(attempt.answers ?? {});
    const mainCorrect = answers.filter((answer) => answer.countsTowardMain18 && answer.finalCorrect).length;
    const firstTry = answers.filter((answer) => answer.firstTryCorrect).length;
    return [attempt.attemptId, attempt.studentId, attempt.status, attempt.startedAt, attempt.completedAt, attempt.energy, mainCorrect, answers.length, firstTry];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
