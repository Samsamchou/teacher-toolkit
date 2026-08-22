import { readFile } from "node:fs/promises";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createPasscodeConfig } from "../lib/teacher-auth.mjs";

const projectId = process.env.GCLOUD_PROJECT || "demo-hwg7-sr";
const region = "asia-east1";
const functionRoot = `http://127.0.0.1:5001/${projectId}/${region}`;
const allowedOrigin = "http://127.0.0.1:5000";
const bank = JSON.parse(await readFile(new URL("../data/question-bank.json", import.meta.url), "utf8"));
const db = getFirestore(initializeApp({ projectId }));

async function post(functionName, body, token = "") {
  const headers = { "Content-Type": "application/json", Origin: allowedOrigin };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${functionRoot}/${functionName}`, { method: "POST", headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await db.collection("privateConfig").doc("teacherAuth").set(await createPasscodeConfig("246810", { salt: Buffer.alloc(24, 11) }));
const students = ["00001", "00002"];

const first = await post("startGame", { unitId: "hwg7-sr", students, requestId: "emulator-request-0001" });
expect(first.status === 200 && first.payload.assignment.phase === "a_type1_b_type2", "first game assignment failed");
const abandoned = await post("abandonGame", { gameSessionId: first.payload.gameSessionId });
expect(abandoned.status === 200 && abandoned.payload.flipped === false, "abandon must not flip");

const second = await post("startGame", { unitId: "hwg7-sr", students, requestId: "emulator-request-0002" });
expect(second.status === 200 && second.payload.assignment.phase === "a_type1_b_type2", "abandoned game changed phase");
const read = bank.questions.filter(question => question.type === "read_aloud").slice(0, 6);
const answer = bank.questions.filter(question => question.type === "question_answer").slice(0, 6);
const selected = read.flatMap((question, index) => [question, answer[index]]);
const turnSummaries = [];
for (let turnIndex = 0; turnIndex < selected.length; turnIndex += 1) {
  const question = selected[turnIndex];
  const attemptId = `${second.payload.gameSessionId}_${String(turnIndex).padStart(2, "0")}_1`;
  const studentCode = students[turnIndex % 2];
  await db.collection("practiceAttempts").doc(attemptId).set({
    id: attemptId,
    gameSessionId: second.payload.gameSessionId,
    unitId: "hwg7-sr",
    date: second.payload.date,
    turnIndex,
    attemptNumber: 1,
    studentCode,
    questionId: question.id,
    questionType: question.type,
    transcript: question.standardReadSentence || question.acceptableAnswers?.[0]?.text || "test",
    result: { scores: { accuracy: 100, completeness: 100, fluency: 100, total: 100 }, passed: true, feedback: "測試", primaryIssue: "achieved" },
    recordingPath: null,
    expiresAt: new Date(Date.now() + 30 * 86400000),
  });
  turnSummaries.push({
    turnIndex,
    questionId: question.id,
    studentCode,
    questionType: question.type,
    status: "passed",
    bestScore: 100,
    attemptIds: [attemptId],
  });
}

const completeBody = { gameSessionId: second.payload.gameSessionId, result: { scores: { pink: 24, blue: 24 }, turnSummaries } };
const completed = await post("completeGame", completeBody);
expect(completed.status === 200 && completed.payload.flipped === true && completed.payload.completedGameCount === 1, "complete did not flip once");
const repeated = await post("completeGame", completeBody);
expect(repeated.status === 200 && repeated.payload.flipped === false && repeated.payload.idempotent === true, "repeat completion was not idempotent");

const third = await post("startGame", { unitId: "hwg7-sr", students, requestId: "emulator-request-0003" });
expect(third.status === 200 && third.payload.assignment.phase === "a_type2_b_type1", "next completed game did not swap A/B types");
await post("abandonGame", { gameSessionId: third.payload.gameSessionId });

const wrongLogin = await post("teacherLogin", { passcode: "135790" });
expect(wrongLogin.status === 401, "wrong teacher login should fail");
const login = await post("teacherLogin", { passcode: "246810" });
expect(login.status === 200 && login.payload.teacherSessionToken, "teacher login failed");
const token = login.payload.teacherSessionToken;
const listed = await post("teacherApi", { action: "listResults", filters: { dateFrom: second.payload.date, dateTo: second.payload.date, unitId: "hwg7-sr", studentCode: "00001" } }, token);
expect(listed.status === 200 && listed.payload.count === 1 && listed.payload.records[0].attempts.length === 12, "teacher filters/details failed");

const directRead = await fetch(`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/practiceResults/${second.payload.gameSessionId}`);
expect(directRead.status === 403, `anonymous Firestore read was not denied: ${directRead.status}`);
const directUpload = await fetch(`http://127.0.0.1:9199/v0/b/${projectId}.appspot.com/o?uploadType=media&name=recordings%2Fblocked.txt`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "blocked" });
expect(directUpload.status === 403, `anonymous Storage upload was not denied: ${directUpload.status}`);

const deleted = await post("teacherApi", { action: "softDeleteResult", resultId: second.payload.gameSessionId }, token);
expect(deleted.status === 200 && deleted.payload.status === "soft_deleted", "soft delete failed");
const afterDelete = await post("teacherApi", { action: "listResults", filters: { dateFrom: second.payload.date, dateTo: second.payload.date } }, token);
expect(afterDelete.status === 200 && afterDelete.payload.count === 0, "soft-deleted result still listed");
const logout = await post("teacherApi", { action: "logout" }, token);
expect(logout.status === 200, "teacher logout failed");
const afterLogout = await post("teacherApi", { action: "listResults", filters: { dateFrom: second.payload.date, dateTo: second.payload.date } }, token);
expect(afterLogout.status === 401, "logged-out teacher token remained valid");

console.log(JSON.stringify({
  ok: true,
  firstPhase: first.payload.assignment.phase,
  phaseAfterAbandon: second.payload.assignment.phase,
  nextPhaseAfterComplete: third.payload.assignment.phase,
  completedGameCount: completed.payload.completedGameCount,
  idempotentRepeat: repeated.payload.idempotent,
  teacherFilteredRecords: listed.payload.count,
  attemptsInRecord: listed.payload.records[0].attempts.length,
  firestoreAnonymousStatus: directRead.status,
  storageAnonymousStatus: directUpload.status,
  softDeleteHiddenCount: afterDelete.payload.count,
  logoutStatus: afterLogout.status
}, null, 2));