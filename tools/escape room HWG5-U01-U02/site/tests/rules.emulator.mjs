// Firestore rules tests (needs the emulator). Run from site/:
//   firebase emulators:exec --only firestore --project demo-quest "node tests/rules.emulator.mjs"
// Test libraries are installed outside Google Drive: QUEST_TEST_DEPS (default %LOCALAPPDATA%/quest-test-deps).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deps = process.env.QUEST_TEST_DEPS || path.join(process.env.LOCALAPPDATA || "", "quest-test-deps");
const req = createRequire(path.join(deps, "package.json"));
const { initializeTestEnvironment, assertFails, assertSucceeds } = req("@firebase/rules-unit-testing");
const { doc, setDoc, updateDoc, getDoc, getDocs, collection, deleteDoc, Timestamp } = req("firebase/firestore");

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEACHER = "teacher-uid-test01";
const rules = readFileSync(path.join(site, "firestore.rules.template"), "utf8").replaceAll("__TEACHER_UID__", TEACHER);
const env = await initializeTestEnvironment({ projectId: "demo-quest", firestore: { rules } });

const attempt = (uid, id = "a1", extra = {}) => ({
  uid, mission: "hwg5-u01-u02", studentId: "60101", attemptId: id, startedAt: "2026-10-18T00:00:00Z",
  updatedAt: "2026-10-18T00:01:00Z", items: [{ seq: 1, attempts: 2, firstTryCorrect: false }], battles: {}, summary: { finished: 1 }, ...extra,
});
const anon = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const teacher = () => env.authenticatedContext(TEACHER, { firebase: { sign_in_provider: "password" } }).firestore();
const results = [];
const t = async (name, fn) => {
  try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name + " — " + e.message]); }
};

await t("student creates own attempt", () => assertSucceeds(setDoc(doc(anon("s1"), "questAttempts/a1"), attempt("s1"))));
await t("student updates own attempt", () => assertSucceeds(updateDoc(doc(anon("s1"), "questAttempts/a1"), { updatedAt: "2026-10-18T00:02:00Z", summary: { finished: 2 } })));
await t("student cannot read own attempt back", () => assertFails(getDoc(doc(anon("s1"), "questAttempts/a1"))));
await t("other device cannot update someone else's attempt", () => assertFails(updateDoc(doc(anon("s2"), "questAttempts/a1"), { summary: { finished: 32 } })));
await t("student cannot change studentId on update", () => assertFails(updateDoc(doc(anon("s1"), "questAttempts/a1"), { studentId: "60999" })));
await t("cannot create with someone else's uid", () => assertFails(setDoc(doc(anon("s3"), "questAttempts/a2"), attempt("s1", "a2"))));
await t("doc id must match attemptId", () => assertFails(setDoc(doc(anon("s3"), "questAttempts/a3"), attempt("s3", "zzz"))));
await t("bad student id rejected", () => assertFails(setDoc(doc(anon("s3"), "questAttempts/a4"), attempt("s3", "a4", { studentId: "abc" }))));
await t("unknown field rejected", () => assertFails(setDoc(doc(anon("s3"), "questAttempts/a5"), attempt("s3", "a5", { name: "Real Name" }))));
await t("signed-out user cannot write", () => assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "questAttempts/a6"), attempt("x", "a6"))));
await t("nobody can delete", () => assertFails(deleteDoc(doc(anon("s1"), "questAttempts/a1"))));
await t("teacher can list all attempts", async () => { const s = await assertSucceeds(getDocs(collection(teacher(), "questAttempts"))); assert.ok(s.size >= 1); });
await t("anonymous user cannot list attempts", () => assertFails(getDocs(collection(anon("s9"), "questAttempts"))));
await t("teacher uid via anonymous provider cannot list", () => assertFails(getDocs(collection(env.authenticatedContext(TEACHER, { firebase: { sign_in_provider: "anonymous" } }).firestore(), "questAttempts"))));
await t("other password user cannot list", () => assertFails(getDocs(collection(env.authenticatedContext("someone", { firebase: { sign_in_provider: "password" } }).firestore(), "questAttempts"))));
const days = n => Timestamp.fromMillis(Date.now() + n * 86400000);
await t("expiresAt 456 days ahead + activeDays accepted", () => assertSucceeds(setDoc(doc(anon("s5"), "questAttempts/b1"), attempt("s5", "b1", { activeDays: ["2026-10-18"], expiresAt: days(456) }))));
await t("expiresAt as text rejected", () => assertFails(setDoc(doc(anon("s5"), "questAttempts/b2"), attempt("s5", "b2", { expiresAt: "2028-01-01" }))));
await t("expiresAt 3 years ahead rejected (would dodge the 15-month limit)", () => assertFails(setDoc(doc(anon("s5"), "questAttempts/b3"), attempt("s5", "b3", { expiresAt: days(1095) }))));
await t("expiresAt in the past rejected", () => assertFails(setDoc(doc(anon("s5"), "questAttempts/b4"), attempt("s5", "b4", { expiresAt: days(-1) }))));
await t("activeDays must be a list", () => assertFails(setDoc(doc(anon("s5"), "questAttempts/b5"), attempt("s5", "b5", { activeDays: "2026-10-18" }))));
await t("update extends expiry on later activity", () => assertSucceeds(updateDoc(doc(anon("s5"), "questAttempts/b1"), { activeDays: ["2026-10-18", "2026-10-20"], expiresAt: days(456) })));
// english-portal behaviour must be unchanged: any signed-in user reads/writes other collections, signed-out cannot
await t("english-portal: signed-in user can write other collections", () => assertSucceeds(setDoc(doc(anon("p1"), "anyPortalCollection/doc1"), { v: 1 })));
await t("english-portal: signed-in user can read other collections", () => assertSucceeds(getDoc(doc(anon("p2"), "anyPortalCollection/doc1"))));
await t("english-portal: nested paths still allowed", () => assertSucceeds(setDoc(doc(anon("p1"), "anyPortalCollection/doc1/sub/x"), { v: 2 })));
await t("english-portal: signed-out still denied", () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "anyPortalCollection/doc1"))));

// ---- questProgress (二水 3D 英語闖關跨裝置接續)
const prog = (sid = "60101", extra = {}) => ({ mission: "ershui-3d-quest", studentId: sid, attemptId: `${sid}-abc`,
  startedAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:01:00Z", results: { Q01: { attempts: 1, quality: 4, finalCorrect: true } },
  cleared: ["station"], version: 1, ...extra });
await t("progress: device A saves progress by student id", () => assertSucceeds(setDoc(doc(anon("d1"), "questProgress/ershui-3d-quest_60101"), prog())));
await t("progress: device B reads the same student's progress", () => assertSucceeds(getDoc(doc(anon("d2"), "questProgress/ershui-3d-quest_60101"))));
await t("progress: device B continues (updates) it", () => assertSucceeds(setDoc(doc(anon("d2"), "questProgress/ershui-3d-quest_60101"), prog("60101", { cleared: ["station", "inn"] }))));
await t("progress: nobody can list all progress", () => assertFails(getDocs(collection(anon("d3"), "questProgress"))));
await t("progress: teacher cannot list either", () => assertFails(getDocs(collection(teacher(), "questProgress"))));
await t("progress: signed-out cannot read", () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "questProgress/ershui-3d-quest_60101"))));
await t("progress: doc id must equal mission_studentId", () => assertFails(setDoc(doc(anon("d1"), "questProgress/ershui-3d-quest_60999"), prog("60101"))));
await t("progress: other missions rejected", () => assertFails(setDoc(doc(anon("d1"), "questProgress/hwg5-u01-u02_60101"), prog("60101", { mission: "hwg5-u01-u02" }))));
await t("progress: another 3D mission (ershui-3d-quest-hwg7) can save", () => assertSucceeds(setDoc(doc(anon("d1"), "questProgress/ershui-3d-quest-hwg7_60101"), prog("60101", { mission: "ershui-3d-quest-hwg7" }))));
await t("progress: look-alike mission names rejected", () => assertFails(setDoc(doc(anon("d1"), "questProgress/ershui-3d-quest-_60101"), prog("60101", { mission: "ershui-3d-quest-" }))));
await t("progress: name field rejected", () => assertFails(setDoc(doc(anon("d1"), "questProgress/ershui-3d-quest_60102"), prog("60102", { name: "Real Name" }))));
await t("progress: nobody can delete", () => assertFails(deleteDoc(doc(anon("d1"), "questProgress/ershui-3d-quest_60101"))));
await t("progress: ershui attempt with 51 items accepted in questAttempts", () => assertSucceeds(setDoc(doc(anon("d5"), "questAttempts/c1"),
  attempt("d5", "c1", { mission: "ershui-3d-quest", items: Array.from({ length: 51 }, (_, i) => ({ seq: i + 1, attempts: 1, quality: 4 })), summary: { score: 100 } }))));
await t("english-portal: collection named questProgressX still behaves like other collections", () => assertSucceeds(setDoc(doc(anon("p1"), "questProgressX/doc1"), { v: 1 })));

await env.cleanup();
for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === "FAIL").length;
console.log(failed ? `RULES FAIL ${failed}` : `RULES PASS ${results.length}/${results.length}`);
process.exit(failed ? 1 : 0);
