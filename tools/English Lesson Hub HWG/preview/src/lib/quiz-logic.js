export const STUDENT_ID_PATTERN = /^[3-6](0[1-9]|[1-9]\d)(0[1-9]|[12]\d|30)$/;

const CLASS_LABELS = ["", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

export function validateStudentId(value) {
  return STUDENT_ID_PATTERN.test(String(value).trim());
}

export function parseStudentId(value) {
  const studentId = String(value).trim();
  if (!validateStudentId(studentId)) return null;
  const grade = Number(studentId.slice(0, 1));
  const classNumber = Number(studentId.slice(1, 3));
  const seatNumber = Number(studentId.slice(3, 5));
  const classLabel = CLASS_LABELS[classNumber] || String(classNumber);
  return {
    studentId,
    grade,
    classNumber,
    classLabel,
    seatNumber,
    label: `${grade}年${classLabel}班${seatNumber}號`
  };
}

export function formatStudentId(value) {
  return parseStudentId(value)?.label || "";
}

export function shuffleOptions(options, random = Math.random) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function halfCheckpoint(totalQuestions) {
  return Math.ceil(totalQuestions / 2);
}

export function checkpointForProgress(completedQuestions, totalQuestions) {
  if (completedQuestions === halfCheckpoint(totalQuestions)) return 0.5;
  if (completedQuestions === totalQuestions) return 1;
  return null;
}

export function scoreSpin(symbols) {
  const uniqueCount = new Set(symbols).size;
  if (uniqueCount === 1) return 100;
  if (uniqueCount === 2) return 50;
  return 10;
}

export function createRunId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "preview-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

export function summarizeResponses(questionSets, responses) {
  const perType = {};
  let totalQuestions = 0;
  let firstAttemptCorrectCount = 0;
  let finalCorrectCount = 0;

  for (const questionSet of questionSets) {
    let typeFirstCorrect = 0;
    let typeFinalCorrect = 0;
    for (const question of questionSet.questions) {
      const response = responses[question.id] || {};
      totalQuestions += 1;
      if (response.firstAttemptCorrect) {
        firstAttemptCorrectCount += 1;
        typeFirstCorrect += 1;
      }
      if (response.finalAnswer === question.correctAnswer) {
        finalCorrectCount += 1;
        typeFinalCorrect += 1;
      }
    }
    perType[questionSet.id] = {
      totalQuestions: questionSet.questions.length,
      firstAttemptCorrectCount: typeFirstCorrect,
      finalCorrectCount: typeFinalCorrect
    };
  }

  return {
    totalQuestions,
    firstAttemptCorrectCount,
    finalCorrectCount,
    practiceScore: firstAttemptCorrectCount,
    perType
  };
}

export function calculateSlotScore(rewardSessions) {
  return rewardSessions.reduce((total, session) => total + session.totalSlotScore, 0);
}
