import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}

test("09:00–12:00 only returns the three confirmed TRA services", async () => {
  const schedule = await importTypeScriptModule(
    join(projectRoot, "firebase-app", "src", "schedule.ts"),
  );
  assert.deepEqual(
    schedule.filterTrains("09:00", "12:00").map((train) => train.number),
    ["2707", "2711", "2713"],
  );
});

test("weekend choices follow Asia/Taipei and roll after Friday", async () => {
  const schedule = await importTypeScriptModule(
    join(projectRoot, "firebase-app", "src", "schedule.ts"),
  );
  assert.deepEqual(
    schedule
      .nearestWeekendDates(new Date("2026-07-29T03:00:00Z"))
      .map((date) => date.iso),
    ["2026-07-31", "2026-08-01", "2026-08-02"],
  );
  assert.deepEqual(
    schedule
      .nearestWeekendDates(new Date("2026-08-01T03:00:00Z"))
      .map((date) => date.iso),
    ["2026-08-07", "2026-08-08", "2026-08-09"],
  );
});

test("all three student destinations have arrival times for every train", async () => {
  const schedule = await importTypeScriptModule(
    join(projectRoot, "firebase-app", "src", "schedule.ts"),
  );
  assert.equal(schedule.TRAIN_SERVICES.length, 11);
  for (const train of schedule.TRAIN_SERVICES) {
    assert.match(train.number, /^27\d{2}$/);
    assert.match(train.arrivals.jiji, /^\d{2}:\d{2}$/);
    assert.match(train.arrivals.shuili, /^\d{2}:\d{2}$/);
    assert.match(train.arrivals.checheng, /^\d{2}:\d{2}$/);
  }
});

test("security rules deny by default and protect teacher reads", async () => {
  const firestoreRules = await readFile(
    join(projectRoot, "firestore.rules"),
    "utf8",
  );
  const storageRules = await readFile(
    join(projectRoot, "storage.rules"),
    "utf8",
  );
  assert.match(firestoreRules, /request\.auth\.token\.teacher == true/);
  assert.match(firestoreRules, /sign_in_provider == "anonymous"/);
  assert.match(firestoreRules, /allow create: if false/);
  assert.match(firestoreRules, /practiceStartedAt == resource\.data\.practiceStartedAt/);
  assert.match(firestoreRules, /match \/\{document=\*\*\}/);
  assert.match(firestoreRules, /allow read, write: if false/);
  assert.match(storageRules, /request\.resource\.size < 20 \* 1024 \* 1024/);
  assert.match(storageRules, /screen-recording\\\\\.\(webm\|mp4\)/);
  assert.match(storageRules, /match \/\{allPaths=\*\*\}/);
  assert.match(storageRules, /allow read, write: if false/);
});

test("Firebase build contains the SPA shell and required classroom images", async () => {
  const index = await readFile(
    join(projectRoot, "firebase-dist", "index.html"),
    "utf8",
  );
  assert.match(index, /<div id="root"><\/div>/);
  for (const file of [
    "home-roundhouse.webp",
    "home-jiji-train.webp",
    "home-railway-reading.webp",
    "home-narrow-gauge.webp",
    "ticket-railway-dopamine-v1.png",
  ]) {
    const fileStat = await stat(
      join(projectRoot, "firebase-dist", "assets", file),
    );
    assert.ok(fileStat.size > 20_000, `${file} should not be empty`);
  }
});

test("step 5 renders every selected journey value beside its checkbox", async () => {
  const source = await readFile(
    join(projectRoot, "firebase-app", "src", "StudentPractice.tsx"),
    "utf8",
  );
  assert.match(source, /DATE／日期/);
  assert.match(source, /TRAIN／車次/);
  assert.match(source, /const summaryValues = \{/);
  for (const key of ["from", "to", "date", "train", "depart", "arrive"]) {
    assert.match(source, new RegExp(`\\b${key}:`));
  }
  assert.match(source, /<b>\{value \|\| "尚未選擇"\}<\/b>/);
  assert.match(source, /disabled=\{!value\}/);
});

test("practice ticket follows the approved field layout without car or seat", async () => {
  const source = await readFile(
    join(projectRoot, "firebase-app", "src", "StudentPractice.tsx"),
    "utf8",
  );
  assert.match(source, /className="ticket-meta"/);
  assert.match(source, /<small>DATE<\/small>/);
  assert.match(source, /<small>TRAIN<\/small>/);
  assert.match(source, /<small>FROM<\/small>[\s\S]*<small>DEPART<\/small>/);
  assert.match(source, /<small>TO<\/small>[\s\S]*<small>ARRIVAL<\/small>/);
  assert.match(source, /className="ticket-student"/);
  assert.doesNotMatch(source, /CAR／SEAT/);
  assert.match(source, /ticket-railway-dopamine-v1\.png/);
});

test("teacher login is password-only and the secret stays server-side", async () => {
  const [teacherSource, firebaseSource, functionsSource] = await Promise.all([
    readFile(
      join(projectRoot, "firebase-app", "src", "TeacherDashboard.tsx"),
      "utf8",
    ),
    readFile(
      join(projectRoot, "firebase-app", "src", "firebase.ts"),
      "utf8",
    ),
    readFile(join(projectRoot, "functions", "index.cjs"), "utf8"),
  ]);
  assert.match(teacherSource, /type="password"/);
  assert.match(teacherSource, /teacherSignIn\(password\)/);
  assert.doesNotMatch(teacherSource, /教師電子郵件|type="email"/);
  assert.match(firebaseSource, /signInWithCustomToken/);
  assert.doesNotMatch(firebaseSource, /signInWithEmailAndPassword/);
  assert.match(functionsSource, /defineSecret\("TEACHER_PASSWORD"\)/);
  assert.match(functionsSource, /MAX_LOGIN_FAILURES = 5/);
  assert.match(functionsSource, /LOGIN_LOCK_MS = 15 \* 60 \* 1000/);
  assert.doesNotMatch(
    functionsSource,
    /logger\.(info|warn|error)\([^;]*(submittedPassword|expectedPassword)/s,
  );
});

test("all site surfaces share the dopamine color system", async () => {
  const styles = await readFile(
    join(projectRoot, "firebase-app", "src", "styles.css"),
    "utf8",
  );
  for (const token of [
    "--pink: #ff4fa3",
    "--aqua: #21c9bb",
    "--purple: #7c3aed",
    "--coral: #ff7657",
  ]) {
    assert.match(styles, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(styles, /\.teacher-login-shell[\s\S]*var\(--pink\)/);
  assert.match(styles, /\.practice-shell[\s\S]*var\(--pink\)/);
  assert.match(styles, /\.unit-card--4/);
});

test("teacher records use trusted practice date and a real visual replay", async () => {
  const [teacherSource, firebaseSource, functionsSource] = await Promise.all([
    readFile(
      join(projectRoot, "firebase-app", "src", "TeacherDashboard.tsx"),
      "utf8",
    ),
    readFile(
      join(projectRoot, "firebase-app", "src", "firebase.ts"),
      "utf8",
    ),
    readFile(join(projectRoot, "functions", "index.cjs"), "utf8"),
  ]);
  assert.match(teacherSource, /practiceDateTaipei: dateFilter/);
  assert.match(teacherSource, /練習日期（按下開始的日期）/);
  assert.match(teacherSource, /搭車日期：\{selected\.travelDate/);
  assert.match(teacherSource, /<video controls playsInline/);
  assert.match(teacherSource, /className="ui-replay-window"/);
  assert.match(teacherSource, /查看原始操作事件（教師查核用）/);
  assert.match(firebaseSource, /createTicketAttemptV2/);
  assert.match(firebaseSource, /where\("practiceDateTaipei", "==", filters\.practiceDateTaipei\)/);
  assert.match(firebaseSource, /\.sort\(/);
  assert.match(functionsSource, /timeZone: TAIPEI_TIME_ZONE/);
  assert.match(functionsSource, /practiceDateStatus: "server"/);
});

test("recording begins from the Start gesture without audio and supports WebM or MP4", async () => {
  const source = await readFile(
    join(projectRoot, "firebase-app", "src", "StudentPractice.tsx"),
    "utf8",
  );
  assert.match(source, /const recordingRequest = requestOptionalRecording\(\)/);
  assert.match(source, /audio: false/);
  assert.match(source, /preferCurrentTab: true/);
  assert.match(source, /video\/webm;codecs=vp9/);
  assert.match(source, /video\/mp4/);
  assert.match(source, /78 \* 1024 \* 1024/);
  assert.match(source, /目前這個分頁/);
});

test("English learning text has enlarged bilingual styles", async () => {
  const styles = await readFile(
    join(projectRoot, "firebase-app", "src", "styles.css"),
    "utf8",
  );
  assert.match(styles, /\.practice-title-row p[\s\S]*clamp\(21px/);
  assert.match(styles, /font-size: max\(18px, 1em\)/);
  assert.match(styles, /\.ui-replay-browserbar b[\s\S]*font-size: 18px/);
});

test("railway reading includes the bilingual double-circle drag activity", async () => {
  const [appSource, readingSource, styles] = await Promise.all([
    readFile(join(projectRoot, "firebase-app", "src", "App.tsx"), "utf8"),
    readFile(join(projectRoot, "firebase-app", "src", "RailwayReading.tsx"), "utf8"),
    readFile(join(projectRoot, "firebase-app", "src", "styles.css"), "utf8"),
  ]);
  assert.match(appSource, /path === "\/units\/railway-reading"/);
  assert.match(appSource, /import\("\.\/RailwayReading"\)/);
  assert.match(readingSource, /Mountain Line/);
  assert.match(readingSource, /Coast Line/);
  assert.match(readingSource, /Both/);
  assert.equal((readingSource.match(/answer: "/g) ?? []).length, 12);
  assert.match(readingSource, /draggable/);
  assert.match(readingSource, /onDragStart/);
  assert.match(readingSource, /onDrop/);
  assert.match(readingSource, /aria-live="polite"/);
  assert.match(readingSource, /放入這一區/);
  assert.match(styles, /\.reading-zones/);
  assert.match(styles, /\.reading-card/);
  assert.match(styles, /\.reading-zone-dropzone/);
});
