import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "@fontsource/comic-relief/400.css";
import "@fontsource/comic-relief/700.css";
import "./styles.css";
import "./media-presentation.css";
import {
  createLesson,
  createSeedLessons,
  createStep,
  findLessonByStudentEntry,
  lessonCountForBook,
  lessonCountForUnit,
  questionBank,
  source,
  standardLessonCount,
  stepTypes
} from "./data/lesson-data.js";
import { loadJson, saveJson } from "./lib/local-storage.js";
import { migrateLessonState, migrateResultsForStructure } from "./lib/lesson-migrations.js";
import {
  calculateSlotScore,
  checkpointForProgress,
  createRunId,
  formatStudentId,
  scoreSpin,
  shuffleOptions,
  summarizeResponses,
  validateStudentId
} from "./lib/quiz-logic.js";
import { buildStudentEntryUrl, isLoopbackBaseUrl, parseStudentEntry, resolveStudentBaseUrl } from "./lib/student-entry.js";
import { RAFFLE_DURATION_MS, createRafflePool, pickRaffleNumber, removeRaffleNumber } from "./lib/classroom-tools.js";
import { projectorShortcutAction } from "./lib/projector-controls.js";
import { firebaseStatus, isFirebaseConfigured } from "./lib/firebase-client.js";
import { deleteTeacherMedia, resolveTeacherMediaUrl } from "./lib/teacher-media-client.js";
import { TeacherMediaUpload } from "./components/teacher-media-upload.jsx";
import { PresentationStep } from "./components/presentation-step.jsx";
import { TeachingVideoPlayer } from "./components/teaching-video-player.jsx";
import {
  deleteResultsAfterExport,
  downloadExport,
  ensureTeacherSession,
  unlockTeacherSession,
  loadTeacherResults,
  recordExportEvent,
  resultsToCsv,
  resultsToJson,
  savePracticeResult,
  teacherSignOut
} from "./lib/result-repository.js";
import { QUIZ_COMPLETION_DURATION_MS, playQuizCorrectChime, playReelStop, playRewardChime, playSlotTick, prepareQuizAudio, prepareSlotAudio, prepareTimerAlarm, startQuizCelebration, startRaffleSpin, startTimerAlarm, stopQuizCelebration, stopRaffleSpin, stopTimerAlarm } from "./lib/slot-audio.js";
const LESSONS_STORAGE_KEY = "english-lesson-hub-v03-preview.lessons";
const RESULTS_STORAGE_KEY = "english-lesson-hub-v03-preview.results";

const STEP_META = {
  warmup: { icon: "👋", label: "Warm-up" },
  ebook: { icon: "📘", label: "E-book" },
  video: { icon: "🎬", label: "Video" },
  presentation: { icon: "🖥️", label: "簡報" },
  webPractice: { icon: "🌐", label: "Practice" },
  vocabularyQuiz: { icon: "🏆", label: "Quiz" }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return minutes + ":" + seconds;
}

function playTone(enabled, frequency = 680, duration = 0.1) {
  if (!enabled) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    window.setTimeout(() => context.close(), (duration + 0.1) * 1000);
  } catch {
    // Browsers may block preview sounds until an interaction; the UI still works.
  }
}

function App() {
  const seedLessons = useMemo(() => createSeedLessons(), []);
  const studentEntry = useMemo(() => parseStudentEntry(window.location.search), []);
  const requestedStudentMode = useMemo(() => new URLSearchParams(window.location.search).get("mode") === "student", []);
  const [lessons, setLessons] = useState(() => {
    const storedLessons = loadJson(LESSONS_STORAGE_KEY, seedLessons);
    return migrateLessonState(storedLessons, seedLessons);
  });
  const [results, setResults] = useState(() => {
    const storedResults = loadJson(RESULTS_STORAGE_KEY, []);
    return migrateResultsForStructure(storedResults, seedLessons);
  });
  const [screen, setScreen] = useState("studio");
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [mode, setMode] = useState("teacher");
  const [notice, setNotice] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    saveJson(LESSONS_STORAGE_KEY, lessons);
  }, [lessons]);

  useEffect(() => {
    saveJson(RESULTS_STORAGE_KEY, results);
  }, [results]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || null;
  const editingLesson = lessons.find((lesson) => lesson.id === editingLessonId) || null;
  const directStudentLesson = findLessonByStudentEntry(seedLessons, studentEntry);

  function saveLesson(nextLesson) {
    const saved = { ...clone(nextLesson), lastModified: dateStamp() };
    setLessons((current) => current.map((lesson) => (lesson.id === saved.id ? saved : lesson)).concat(
      current.some((lesson) => lesson.id === saved.id) ? [] : [saved]
    ));
    setNotice("Lesson 已儲存；學生 QR 永遠只會開啟該節的 Vocabulary Quiz。");
  }

  function startLesson(lessonId) {
    setActiveLessonId(lessonId);
    setMode("teacher");
    setScreen("cockpit");
  }

  function duplicateLesson(lesson) {
    const duplicate = clone(lesson);
    duplicate.id = `${lesson.id}-copy-${Date.now()}`;
    duplicate.title = `${lesson.title} Copy`;
    duplicate.bookId = "custom";
    duplicate.unitId = "custom";
    duplicate.unitKey = "custom";
    duplicate.lastModified = dateStamp();
    setLessons((current) => [...current, duplicate]);
    setNotice("已建立可自由調整的 Lesson 副本。");
  }

  function deleteLesson(lesson) {
    if (lesson.bookId !== "custom") {
      setNotice("Starter 與 Unit 1–4 的 46 節預設 Lesson 會固定保留；可改用「重設 Lesson」。");
      return;
    }
    if (!window.confirm(`確定刪除 ${lesson.title} 嗎？`)) return;
    setLessons((current) => current.filter((item) => item.id !== lesson.id));
    setNotice("自訂 Lesson 已刪除。");
  }

  function resetLesson(lesson) {
    const seed = seedLessons.find((item) => item.id === lesson.id);
    if (!seed) return;
    if (!window.confirm(`重設 ${lesson.title} 為目前範本？已調整的 Step 會被取代。`)) return;
    setLessons((current) => current.map((item) => (item.id === lesson.id ? clone(seed) : item)));
    setNotice("Lesson 已重設為目前範本。");
  }

  function createAndEditLesson() {
    const lesson = createLesson();
    setLessons((current) => [...current, lesson]);
    setEditingLessonId(lesson.id);
  }

  async function saveQuizResult(result) {
    const outcome = await savePracticeResult(result);
    if (outcome.storage === "local") {
      setResults((current) => {
        const index = current.findIndex((item) => item.id === result.id);
        if (index === -1) return [result, ...current];
        const next = [...current];
        next[index] = result;
        return next;
      });
      setNotice("本機 Preview 已保存匿名 Student ID 作答結果。");
    } else {
      setNotice("作答結果已安全寫入 Firestore；只含匿名 Student ID，不含姓名。");
    }
    return outcome;
  }

  function resetPreview() {
    if (!window.confirm("重設本機 Lesson 與本機 Preview Results？原始題庫與素材不會受影響。")) return;
    window.localStorage.removeItem(LESSONS_STORAGE_KEY);
    window.localStorage.removeItem(RESULTS_STORAGE_KEY);
    setLessons(seedLessons);
    setResults([]);
    setEditingLessonId(null);
    setActiveLessonId(null);
    setScreen("studio");
    setNotice("Preview 已回復為 10 個單元、Starter 3 節與 Unit 1–4 各 5 節的預設結構。");
  }

  if (requestedStudentMode) {
    return (
      <StudentQuizPage
        lesson={directStudentLesson}
        soundOn={soundOn}
        onSoundChange={() => setSoundOn((value) => !value)}
        onSaveResult={saveQuizResult}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        screen={screen}
        mode={mode}
        soundOn={soundOn}
        onSoundChange={() => setSoundOn((value) => !value)}
        onStudio={() => {
          setScreen("studio");
          setEditingLessonId(null);
        }}
        onResults={() => setScreen("results")}
        onModeChange={setMode}
      />
      {notice ? <div className="notice" role="status">{notice}</div> : null}

      {screen === "studio" ? (
        <TeacherStudio
          lessons={lessons}
          editingLesson={editingLesson}
          onStart={startLesson}
          onEdit={setEditingLessonId}
          onDuplicate={duplicateLesson}
          onDelete={deleteLesson}
          onResetLesson={resetLesson}
          onCreate={createAndEditLesson}
          onSave={saveLesson}
          onCloseEditor={() => setEditingLessonId(null)}
          onReset={resetPreview}
        />
      ) : null}

      {screen === "cockpit" && activeLesson ? (
        <LessonCockpit
          lesson={activeLesson}
          mode={mode}
          soundOn={soundOn}
          onModeChange={setMode}
          onExit={() => {
            setScreen("studio");
            setEditingLessonId(null);
          }}
          onResults={() => setScreen("results")}
          onSaveResult={saveQuizResult}
        />
      ) : null}

      {screen === "results" ? (
        <ResultsDashboard
          localResults={results}
          lessons={lessons}
          onBack={() => setScreen("studio")}
          onClearLocal={(resultIds) => {
              const ids = new Set(Array.isArray(resultIds) ? resultIds : []);
              setResults((current) => current.filter((item) => !ids.has(item.id || item.sessionId)));
              setNotice("本機 Preview 已清除這次匯出的 Results。");
            }}
        />
      ) : null}
    </div>
  );
}

function AppHeader({ screen, mode, soundOn, onSoundChange, onStudio, onResults, onModeChange }) {
  const status = firebaseStatus();
  if (screen === "cockpit" && mode === "teacher") return null;
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">EL</span>
        <div>
          <strong>English Lesson Hub</strong>
          <span>{status.enabled ? "Firebase-ready Teacher Studio" : "Local Preview · Firebase config pending"}</span>
        </div>
      </div>
      <div className="header-actions">
        <button className="text-button" onClick={onStudio}>Teacher Studio</button>
        <button className="text-button" onClick={onResults}>Results</button>
        {screen === "cockpit" ? (
          <div className="mode-switch" aria-label="教室顯示模式">
            <button className={mode === "teacher" ? "active" : ""} onClick={() => onModeChange("teacher")}>教師流程</button>
            <button className={mode === "student" ? "active" : ""} onClick={() => onModeChange("student")}>學生掃碼</button>
          </div>
        ) : null}
        <button className="sound-button" onClick={onSoundChange} aria-label="切換音效">{soundOn ? "🔊" : "🔇"}</button>
      </div>
    </header>
  );
}

function themeStyle(theme = {}) {
  return {
    "--unit-primary": theme.primary || "#2358e5",
    "--unit-secondary": theme.secondary || "#2fbcff",
    "--unit-soft": theme.soft || "#e8efff",
    "--unit-ink": theme.ink || "#182f8e"
  };
}

function TeacherStudio({
  lessons,
  editingLesson,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
  onResetLesson,
  onCreate,
  onSave,
  onCloseEditor,
  onReset
}) {
  const [expandedUnitKey, setExpandedUnitKey] = useState(null);
  const totalUnitCount = (source.books || []).reduce((total, book) => total + (book.units || []).length, 0);
  const totalStandardLessons = standardLessonCount();

  if (editingLesson) {
    return <LessonEditor lesson={editingLesson} onSave={(lesson) => { onSave(lesson); onCloseEditor(); }} onCancel={onCloseEditor} />;
  }

  const customLessons = lessons.filter((lesson) => lesson.bookId === "custom");
  return (
    <main className="studio-page">
      <section className="studio-hero">
        <div>
          <p className="eyebrow">Teacher-configurable Lesson Cockpit</p>
          <h1>{totalUnitCount} 個單元，{totalStandardLessons} 節課，隨時可調整。</h1>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={onCreate}>＋ New Custom Lesson</button>
          <button className="secondary-button" onClick={onReset}>重設本機 Preview</button>
        </div>
      </section>

      {(source.books || []).map((book) => (
        <section className="book-section" key={book.id}>
          <div className="book-heading"><div><p className="eyebrow">{book.grade}</p><h2>{book.label}</h2></div><span>{book.units.length} Units · {lessonCountForBook(book)} Lessons</span></div>
          {book.units.map((unit) => {
            const key = `${book.id}-${unit.id}`;
            const unitLessons = lessons.filter((lesson) => lesson.bookId === book.id && lesson.unitId === unit.id).sort((a, b) => a.lessonNumber - b.lessonNumber);
            const theme = source.unitThemes[key];
            const lessonCount = lessonCountForUnit(unit);
            const expanded = expandedUnitKey === key;
            return (
              <section className={"unit-section " + (expanded ? "expanded" : "")} key={key} style={themeStyle(theme)}>
                <button className="unit-disclosure" type="button" onClick={() => setExpandedUnitKey((current) => current === key ? null : key)} aria-expanded={expanded} aria-controls={`lesson-list-${key}`}>
                  <span className="unit-disclosure-title"><span className="unit-color-dot" aria-hidden="true" /><span>{unit.title}</span></span>
                  <span className="unit-disclosure-meta">{unitLessons.length} / {lessonCount} Lessons <span className="unit-disclosure-chevron" aria-hidden="true">{expanded ? "⌃" : "⌄"}</span></span>
                </button>
                {expanded ? <ol className="unit-lesson-list" id={`lesson-list-${key}`} aria-label={`${book.label} ${unit.title} Lessons`}>{unitLessons.map((lesson) => <LessonListRow key={lesson.id} lesson={lesson} onStart={onStart} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} onResetLesson={onResetLesson} />)}</ol> : null}
              </section>
            );
          })}
        </section>
      ))}

      {customLessons.length ? <section className="book-section custom-book-section"><div className="book-heading"><div><p className="eyebrow">Teacher-created</p><h2>Custom Lessons</h2></div></div><div className="lesson-grid">{customLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} onStart={onStart} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} onResetLesson={onResetLesson} />)}</div></section> : null}
    </main>
  );
}

function LessonListRow({ lesson, onStart, onEdit, onDuplicate, onDelete, onResetLesson }) {
  const coreLesson = lesson.bookId !== "custom";
  const enabledStepCount = lesson.steps.filter((step) => step.enabled).length;
  return (
    <li className="lesson-list-row">
      <button className="lesson-list-edit" type="button" onClick={() => onEdit(lesson.id)} aria-label={`編輯 ${lesson.title}`}>
        <span className="lesson-list-number">Lesson {lesson.lessonNumber}</span>
        <span className="lesson-list-summary">{enabledStepCount} Steps</span>
      </button>
      <div className="lesson-list-actions">
        <button className="lesson-list-start" type="button" onClick={() => onStart(lesson.id)} aria-label={`開始 ${lesson.title}`} data-tooltip="開始上課"><span aria-hidden="true">▶</span></button>
        <details className="lesson-list-more">
          <summary aria-label={`${lesson.title} 更多操作`} data-tooltip="更多操作">⋯</summary>
          <div className="lesson-more-menu">
            <button type="button" onClick={() => onDuplicate(lesson)}>Duplicate</button>
            {coreLesson ? <button type="button" onClick={() => onResetLesson(lesson)}>Reset</button> : <button type="button" onClick={() => onDelete(lesson)}>Delete</button>}
          </div>
        </details>
      </div>
    </li>
  );
}
function LessonCard({ lesson, onStart, onEdit, onDuplicate, onDelete, onResetLesson }) {
  const coreLesson = lesson.bookId !== "custom";
  return (
    <article className="lesson-card" style={themeStyle(lesson.theme)}>
      <div className="lesson-card-top"><span className="book-badge">{lesson.book}</span><span className="muted">{lesson.grade}</span></div>
      <p className="lesson-number-label">Lesson {lesson.lessonNumber || "–"}</p>
      <h2>{lesson.title}</h2>
      <p>{lesson.steps.filter((step) => step.enabled).length} enabled steps · Updated {lesson.lastModified}</p>
      <div className="card-actions">
        <button className="primary-button" onClick={() => onStart(lesson.id)}>Start Lesson</button>
        <button className="secondary-button" onClick={() => onEdit(lesson.id)}>Edit</button>
        <button className="icon-text-button" onClick={() => onDuplicate(lesson)}>Duplicate</button>
        {coreLesson ? <button className="icon-text-button" onClick={() => onResetLesson(lesson)}>Reset</button> : <button className="danger-text-button" onClick={() => onDelete(lesson)}>Delete</button>}
      </div>
    </article>
  );
}

function StudentQuizPage({ lesson, soundOn, onSoundChange, onSaveResult }) {
  if (!lesson) {
    return <main className="student-quiz-page"><StudentPageHeader soundOn={soundOn} onSoundChange={onSoundChange} /><section className="empty-state"><h1>找不到這一節課。</h1><p>請重新掃描老師投影的 QR Code。</p></section></main>;
  }
  const quizStep = lesson.steps.find((step) => step.type === "vocabularyQuiz" && step.enabled && step.content?.quizEnabled);
  return (
    <main className="student-quiz-page" style={themeStyle(lesson.theme)}>
      <StudentPageHeader soundOn={soundOn} onSoundChange={onSoundChange} />
      <div className="student-quiz-content">
        <p className="eyebrow">{lesson.book} · {lesson.unit} · Lesson {lesson.lessonNumber}</p>
        {quizStep ? <QuizExperience lesson={lesson} bank={questionBank} soundOn={soundOn} onSaveResult={onSaveResult} studentOnly /> : <section className="empty-state"><h1>這節課尚未開放 Vocabulary Quiz。</h1><p>請等待老師開啟本節題庫後，再重新掃描 QR Code。</p></section>}
      </div>
    </main>
  );
}

function StudentPageHeader({ soundOn, onSoundChange }) {
  return <header className="student-page-header"><div className="brand"><span className="brand-mark">EL</span><div><strong>English Lesson Hub</strong><span>Vocabulary Quiz</span></div></div><button className="sound-button" onClick={onSoundChange} aria-label="切換音效">{soundOn ? "🔊" : "🔇"}</button></header>;
}

function StudentJoinPanel({ lesson }) {
  const storageKey = "english-lesson-hub-v03.student-join-base";
  const configuredBase = resolveStudentBaseUrl({
    origin: window.location.origin,
    productionBaseUrl: source.studentEntry.productionBaseUrl,
    localLanBaseUrl: source.studentEntry.localLanBaseUrl
  });
  const [baseUrl, setBaseUrl] = useState(() => window.localStorage.getItem(storageKey) || configuredBase);
  const normalizedBase = resolveStudentBaseUrl({
    origin: baseUrl || window.location.origin,
    productionBaseUrl: baseUrl,
    localLanBaseUrl: baseUrl
  });
  const joinUrl = buildStudentEntryUrl({ baseUrl: normalizedBase, bookId: lesson.bookId, unitId: lesson.unitId, lessonNumber: lesson.lessonNumber });
  const needsLanAddress = isLoopbackBaseUrl(window.location.origin) && !joinUrl;

  function saveAddress() {
    window.localStorage.setItem(storageKey, baseUrl.trim());
  }

  async function copyLink() {
    if (!joinUrl) return;
    try { await navigator.clipboard.writeText(joinUrl); } catch { window.prompt("複製學生連結", joinUrl); }
  }

  return (
    <section className="student-join-panel" style={themeStyle(lesson.theme)}>
      <div className="join-copy"><p className="eyebrow">Student mode · QR entry only</p><h2>學生掃碼，直接進入本節 Vocabulary Quiz。</h2><p>QR 只帶入 book、unit、lesson；沒有學生姓名、帳密或教師端電子書。iPad Safari 掃碼後會直接開啟作答頁。</p></div>
      <div className="join-card">
        {joinUrl ? <QrCodeImage value={joinUrl} /> : <div className="qr-placeholder">QR</div>}
        <div className="join-details"><strong>{lesson.title}</strong><span>{lesson.book} · {lesson.unit} · Lesson {lesson.lessonNumber}</span>{joinUrl ? <a href={joinUrl} target="_blank" rel="noreferrer">開啟學生作答連結</a> : <span className="form-error">請先設定學生可連線的網址。</span>}<button className="secondary-button" onClick={copyLink} disabled={!joinUrl}>複製連結</button></div>
      </div>
      <label className="join-address-label">學生加入網址（Firebase 部署後會自動使用正式網址；本機預覽請填同 Wi‑Fi LAN 網址）<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} onBlur={saveAddress} placeholder="例如 http://192.168.1.20:4173" /></label>
      {needsLanAddress ? <p className="join-help">目前是 127.0.0.1，本機 QR 無法讓 iPad 開啟；請輸入老師電腦的同 Wi‑Fi LAN 網址，或等 Firebase Hosting 部署完成後再掃碼。</p> : null}
    </section>
  );
}

function QrCodeImage({ value, className = "student-qr", width = 260 }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width, margin: 1, errorCorrectionLevel: "M", color: { dark: "#15215c", light: "#ffffff" } })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [value, width]);
  return dataUrl ? <img className={className} src={dataUrl} alt="學生掃碼進入 Vocabulary Quiz" /> : <div className="qr-placeholder">QR</div>;
}
function LessonEditor({ lesson, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => clone(lesson));
  const [newStepType, setNewStepType] = useState("warmup");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [mediaChanges, setMediaChanges] = useState({ uploads: [], cleanup: [] });

  useEffect(() => {
    setDraft(clone(lesson));
  }, [lesson]);

  function updateLessonField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateStep(index, patch) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, currentIndex) =>
        currentIndex === index ? { ...step, ...patch } : step
      )
    }));
  }

  function updateStepContent(index, patch) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, currentIndex) =>
        currentIndex === index
          ? { ...step, content: { ...step.content, ...patch } }
          : step
      )
    }));
  }

  function moveStep(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= draft.steps.length || fromIndex === toIndex) return;
    setDraft((current) => {
      const nextSteps = [...current.steps];
      const [moved] = nextSteps.splice(fromIndex, 1);
      nextSteps.splice(toIndex, 0, moved);
      return { ...current, steps: nextSteps };
    });
  }

  function removeStep(index) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function changeStepType(index, type) {
    const replacement = createStep(type, index);
    updateStep(index, {
      type,
      title: replacement.title,
      content: replacement.content
    });
  }
  function trackMediaUpload({ newPath, previousPath }) {
    setMediaChanges((current) => ({
      uploads: current.uploads.includes(newPath) ? current.uploads : [...current.uploads, newPath],
      cleanup: previousPath && !current.cleanup.includes(previousPath) ? [...current.cleanup, previousPath] : current.cleanup
    }));
  }

  function trackMediaRemoval(path) {
    if (!path) return;
    setMediaChanges((current) => ({
      ...current,
      cleanup: current.cleanup.includes(path) ? current.cleanup : [...current.cleanup, path]
    }));
  }

  return (
    <main className="editor-page">
      <div className="editor-title-row">
        <div>
          <p className="eyebrow">Lesson Studio</p>
          <h1>Edit Lesson Flow</h1>
        </div>
        <div className="editor-actions">
          <button className="secondary-button" onClick={() => { const uploads = mediaChanges.uploads; onCancel(); uploads.forEach((path) => { deleteTeacherMedia(path).catch(() => undefined); }); }}>取消</button>
          <button className="primary-button" onClick={() => {
            onSave(draft);
            const cleanup = mediaChanges.cleanup;
            setMediaChanges({ uploads: [], cleanup: [] });
            cleanup.forEach((path) => { deleteTeacherMedia(path).catch(() => undefined); });
          }}>Save Lesson</button>
        </div>
      </div>

      <section className="editor-card lesson-details">
        <h2>Lesson details</h2>
        <div className="form-grid three-columns">
          <label>Lesson title<input value={draft.title} onChange={(event) => updateLessonField("title", event.target.value)} /></label>
          <label>Book<input value={draft.book} onChange={(event) => updateLessonField("book", event.target.value)} /></label>
          <label>Grade<input value={draft.grade} onChange={(event) => updateLessonField("grade", event.target.value)} /></label>
          <label>Unit<input value={draft.unit} onChange={(event) => updateLessonField("unit", event.target.value)} /></label>
        </div>
      </section>

      <section className="editor-card">
        <div className="section-heading">
          <div>
            <h2>Lesson Flow</h2>
            <p>可拖曳排序；觸控裝置也可用上下箭頭。教材只改資料，不需要修改程式。</p>
          </div>
          <div className="add-step-row">
            <select value={newStepType} onChange={(event) => setNewStepType(event.target.value)}>
              {stepTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <button
              className="secondary-button"
              onClick={() => setDraft((current) => ({
                ...current,
                steps: [...current.steps, createStep(newStepType, current.steps.length)]
              }))}
            >
              ＋ Add Step
            </button>
          </div>
        </div>

        <div className="step-editor-list">
          {draft.steps.map((step, index) => (
            <article
              className="step-editor-card"
              key={step.id}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedIndex !== null) moveStep(draggedIndex, index);
                setDraggedIndex(null);
              }}
            >
              <div className="step-editor-heading">
                <span className="drag-handle" title="拖曳排序">⋮⋮</span>
                <span className="step-number">{index + 1}</span>
                <select value={step.type} onChange={(event) => changeStepType(index, event.target.value)}>
                  {stepTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <input
                  className="step-title-input"
                  value={step.title}
                  aria-label={"Step " + (index + 1) + " title"}
                  onChange={(event) => updateStep(index, { title: event.target.value })}
                />
                <label className="enabled-toggle">
                  <input
                    type="checkbox"
                    checked={step.enabled}
                    onChange={(event) => updateStep(index, { enabled: event.target.checked })}
                  />
                  Enabled
                </label>
                <div className="step-order-actions">
                  <button onClick={() => moveStep(index, index - 1)} disabled={index === 0} aria-label="上移">↑</button>
                  <button onClick={() => moveStep(index, index + 1)} disabled={index === draft.steps.length - 1} aria-label="下移">↓</button>
                  <button className="danger-mini" onClick={() => removeStep(index)} aria-label="刪除 Step">✕</button>
                </div>
              </div>
              <StepContentFields
                step={step}
                lessonId={draft.id}
                onChange={(patch) => updateStepContent(index, patch)}
                onTrackUpload={trackMediaUpload}
                onTrackRemoval={trackMediaRemoval}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function StepContentFields({ step, lessonId, onChange, onTrackUpload, onTrackRemoval }) {
  const content = step.content || {};
  if (step.type === "warmup") {
    return (
      <label className="full-width">Warm-up text
        <textarea value={content.body || ""} onChange={(event) => onChange({ body: event.target.value })} />
      </label>
    );
  }
  if (step.type === "ebook") {
    return (
      <div className="form-grid two-columns compact-fields">
        <label>Display name<input value={content.displayName || ""} onChange={(event) => onChange({ displayName: event.target.value })} /></label>
        <label>E-book URL<input value={content.url || ""} onChange={(event) => onChange({ url: event.target.value })} /></label>
        <label className="check-field"><input type="checkbox" checked={Boolean(content.teacherOnly)} onChange={(event) => onChange({ teacherOnly: event.target.checked })} /> 僅教師端顯示</label>
        <label className="check-field"><input type="checkbox" checked={Boolean(content.allowFullscreen)} onChange={(event) => onChange({ allowFullscreen: event.target.checked })} /> Allow fullscreen</label>
      </div>
    );
  }
  if (step.type === "video") {
    return (
      <div className="step-media-fields">
        <div className="form-grid two-columns compact-fields">
          <label>Video URL<input value={content.url || ""} onChange={(event) => onChange({ url: event.target.value })} placeholder="可貼入 HTTPS 影片網址" /></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(content.abRepeat)} onChange={(event) => onChange({ abRepeat: event.target.checked })} /> 顯示 AB Repeat 控制</label>
        </div>
        <TeacherMediaUpload
          lessonId={lessonId}
          mediaType="video"
          media={content.uploadedMedia}
          onChange={onChange}
          onTrackUpload={onTrackUpload}
          onTrackRemoval={onTrackRemoval}
        />
      </div>
    );
  }
  if (step.type === "presentation") {
    return (
      <div className="step-media-fields">
        <div className="form-grid compact-fields">
          <label>Display name<input value={content.displayName || ""} onChange={(event) => onChange({ displayName: event.target.value })} placeholder="例如 Unit 1 簡報" /></label>
        </div>
        <TeacherMediaUpload
          lessonId={lessonId}
          mediaType="presentation"
          media={content.uploadedMedia}
          onChange={onChange}
          onTrackUpload={onTrackUpload}
          onTrackRemoval={onTrackRemoval}
        />
        <p className="field-help">請先將 PowerPoint（PPT／PPTX）另存為 PDF，再上傳。Lesson Flow 會從第 1 頁開啟。</p>
      </div>
    );
  }
  if (step.type === "imageSlides") {
    return (
      <label className="full-width">Slides（每行一個圖片網址或路徑）
        <textarea
          value={(content.slides || []).join("\n")}
          onChange={(event) => onChange({ slides: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean), slidesFromQuestionBank: false })}
        />
      </label>
    );
  }
  if (step.type === "webPractice") {
    return (
      <div className="form-grid two-columns compact-fields">
        <label>Display name<input value={content.displayName || ""} onChange={(event) => onChange({ displayName: event.target.value })} /></label>
        <label>Practice URL<input value={content.url || ""} onChange={(event) => onChange({ url: event.target.value })} /></label>
      </div>
    );
  }
  return (
    <label className="check-field"><input type="checkbox" checked={Boolean(content.quizEnabled)} onChange={(event) => onChange({ quizEnabled: event.target.checked })} /> 啟用 Native Vocabulary Quiz</label>
  );
}

function downloadCanvasAsPng(canvas, filename) {
  if (!canvas) return;
  const triggerDownload = (url, revoke = false) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (typeof canvas.toBlob === "function") {
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(URL.createObjectURL(blob), true);
      else triggerDownload(canvas.toDataURL("image/png"));
    }, "image/png");
    return;
  }
  triggerDownload(canvas.toDataURL("image/png"));
}

function createExternalAnnotationSnapshot({ stage, annotationCanvas, title }) {
  const bounds = stage.getBoundingClientRect();
  const width = Math.max(960, Math.round(bounds.width));
  const contentHeight = Math.max(540, Math.round(bounds.height));
  const headerHeight = 112;
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const output = document.createElement("canvas");
  output.width = Math.round(width * scale);
  output.height = Math.round((contentHeight + headerHeight) * scale);
  const context = output.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, contentHeight + headerHeight);
  context.fillStyle = "#f0f6ff";
  context.fillRect(0, 0, width, headerHeight);
  context.fillStyle = "#173d7a";
  context.font = "700 26px Comic Relief, sans-serif";
  context.fillText(String(title || "Lesson Hub").slice(0, 64), 30, 43);
  context.fillStyle = "#526d97";
  context.font = "700 15px system-ui, sans-serif";
  context.fillText("Wayground 外部畫面未包含；此 PNG 僅保留教師畫筆標註。", 30, 76);
  context.strokeStyle = "#d4e2f6";
  context.strokeRect(0.5, headerHeight + 0.5, width - 1, contentHeight - 1);
  if (annotationCanvas?.width && annotationCanvas?.height) {
    context.drawImage(
      annotationCanvas,
      0,
      0,
      annotationCanvas.width,
      annotationCanvas.height,
      0,
      headerHeight,
      width,
      contentHeight
    );
  }
  return output;
}

function projectionFileName(lesson, step, kind) {
  const sourceName = `${lesson.id || lesson.title || "lesson"}-${step.id || step.type || "step"}-${kind}`;
  const safeName = sourceName.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `lesson-hub-${safeName}-${stamp}.png`;
}

function LessonCockpit({ lesson, mode, soundOn, onModeChange, onExit, onResults, onSaveResult }) {
  const steps = lesson.steps.filter((step) => step.enabled);
  const [stepIndex, setStepIndex] = useState(0);
  const [flowExpanded, setFlowExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [annotationTool, setAnnotationTool] = useState("select");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  const [annotationSize, setAnnotationSize] = useState(5);
  const [clearToken, setClearToken] = useState(0);
  const [toolNotice, setToolNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeIndex];

  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key !== "Escape") return;
      setActiveTool(null);
      setAnnotationTool("select");
    }
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  useEffect(() => {
    setActiveTool(null);
    setAnnotationTool("select");
    setToolNotice("");
  }, [currentStep?.id]);

  useEffect(() => {
    if (mode !== "teacher") return undefined;
    document.body.classList.add("projector-active");
    return () => document.body.classList.remove("projector-active");
  }, [mode]);

  useEffect(() => {
    if (mode !== "teacher") return undefined;
    function isEditingControl(target) {
      const tagName = target?.tagName?.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
    }

    function handleProjectorKey(event) {
      if (isEditingControl(event.target)) return;
      const action = projectorShortcutAction(event.key);
      if (!action) return;
      event.preventDefault();
      if (action === "previous") selectStep(safeIndex - 1);
      if (action === "next") goNext();
      if (action === "fullscreen") toggleStageFullscreen();
    }

    window.addEventListener("keydown", handleProjectorKey);
    return () => window.removeEventListener("keydown", handleProjectorKey);
  }, [safeIndex, steps.length, onExit]);

  if (mode === "student") {
    return (
      <main className="cockpit-page student-join-mode" style={themeStyle(lesson.theme)}>
        <div className="cockpit-topbar"><div><p className="eyebrow">{lesson.book} · {lesson.unit}</p><h1>{lesson.title}</h1></div><div className="cockpit-mode-note">教師投影：學生掃 QR</div></div>
        <StudentJoinPanel lesson={lesson} />
        <div className="student-footer"><button className="secondary-button" onClick={() => onModeChange("teacher")}>回教師流程</button><button className="icon-text-button" onClick={onExit}>回 Teacher Studio</button></div>
      </main>
    );
  }

  if (!currentStep) {
    return <main className="empty-state"><h1>這個 Lesson 目前沒有 enabled Step。</h1><button className="primary-button" onClick={onExit}>回 Teacher Studio</button></main>;
  }

  function selectStep(nextIndex) {
    const bounded = Math.min(Math.max(nextIndex, 0), steps.length - 1);
    if (bounded === safeIndex) return;
    setStepIndex(bounded);
    setActiveTool(null);
    setAnnotationTool("select");
    setToolNotice("");
  }

  function goNext() {
    if (safeIndex < steps.length - 1) selectStep(safeIndex + 1);
    else onExit();
  }

  async function toggleStageFullscreen() {
    const stage = stageRef.current;
    if (!stage?.requestFullscreen) {
      setToolNotice("這個瀏覽器目前不支援教材全螢幕。");
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await stage.requestFullscreen();
    } catch {
      setToolNotice("無法切換教材全螢幕；可使用外部平台的全螢幕功能。");
    }
  }

  function toggleTool(nextTool) {
    const willOpen = activeTool !== nextTool;
    setActiveTool(willOpen ? nextTool : null);
    setAnnotationTool(willOpen && nextTool === "draw" ? (annotationTool === "select" ? "pen" : annotationTool) : "select");
    setToolNotice("");
  }

  function closeTools() {
    setActiveTool(null);
    setAnnotationTool("select");
  }

  async function exportProjection() {
    const stage = stageRef.current;
    const annotationCanvas = annotationCanvasRef.current;
    if (!stage || exporting) return;
    setExporting(true);
    setToolNotice("");
    const filename = projectionFileName(lesson, currentStep, currentStep.type === "webPractice" ? "annotation" : "projection");
    try {
      if (currentStep.type === "webPractice") {
        downloadCanvasAsPng(createExternalAnnotationSnapshot({ stage, annotationCanvas, title: `${lesson.title} · ${currentStep.title}` }), filename);
        setToolNotice("已匯出畫筆標註與課程標題；Wayground 外部畫面不會被擷取。");
        return;
      }
      const module = await import("html2canvas");
      const capture = module.default || module;
      const screenshot = await capture(stage, {
        backgroundColor: "#ffffff",
        logging: false,
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        useCORS: true
      });
      downloadCanvasAsPng(screenshot, filename);
      setToolNotice("已匯出目前 Lesson Hub 投影畫面 PNG。");
    } catch {
      downloadCanvasAsPng(createExternalAnnotationSnapshot({ stage, annotationCanvas, title: `${lesson.title} · ${currentStep.title}` }), filename);
      setToolNotice("完整畫面擷取暫時不可用，已改匯出畫筆標註與課程標題。");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="cockpit-page projector-cockpit" style={themeStyle(lesson.theme)}>
      <div className="cockpit-topbar">
        <div><p className="eyebrow">{lesson.book} · {lesson.unit} · Lesson {lesson.lessonNumber}</p><h1>{lesson.title}</h1></div>
        <div className="cockpit-top-actions"><div className="cockpit-mode-note">教師正在控制 Lesson Flow</div><button className="lesson-flow-toggle" onClick={() => setFlowExpanded((value) => !value)} aria-expanded={flowExpanded}>{flowExpanded ? "收合 Lesson Flow" : "展開 Lesson Flow"} <span>{safeIndex + 1} / {steps.length}</span></button></div>
      </div>
      {flowExpanded ? <nav className="progress-bar" aria-label="Lesson Progress">{steps.map((step, index) => <button key={step.id} className={index === safeIndex ? "active" : ""} onClick={() => selectStep(index)}><span>{index + 1}</span><small>{step.title}</small></button>)}</nav> : null}
      <div className="cockpit-layout">
        <TeacherToolRail activeTool={activeTool} onSelect={toggleTool} />
        <ClassroomToolPopover
          activeTool={activeTool}
          onClose={closeTools}
          soundOn={soundOn}
          annotationTool={annotationTool}
          annotationColor={annotationColor}
          annotationSize={annotationSize}
          onAnnotationTool={setAnnotationTool}
          onAnnotationColor={setAnnotationColor}
          onAnnotationSize={setAnnotationSize}
          onClear={() => setClearToken((value) => value + 1)}
          onExport={exportProjection}
          exporting={exporting}
          exportNotice={toolNotice}
          externalPractice={currentStep.type === "webPractice"}
        />
        <section className="lesson-stage" ref={stageRef}>
          <AnnotationCanvas
            enabled={activeTool === "draw" && annotationTool !== "select"}
            tool={annotationTool}
            color={annotationColor}
            size={annotationSize}
            clearToken={clearToken}
            pageKey={currentStep.id}
            annotationCanvasRef={annotationCanvasRef}
          />
          <StepRenderer step={currentStep} mode="teacher" lesson={lesson} soundOn={soundOn} onSaveResult={onSaveResult} />
        </section>
      </div>
      <TeachingDock current={safeIndex} total={steps.length} onHome={onExit} onPrevious={() => selectStep(safeIndex - 1)} onNext={goNext} onResults={onResults} />
    </main>
  );
}

function TeacherToolRail({ activeTool, onSelect }) {
  const tools = [
    { id: "raffle", icon: "🎲", label: "抽籤" },
    { id: "timer", icon: "⏱", label: "倒數" },
    { id: "draw", icon: "✏️", label: "畫筆" }
  ];
  return (
    <aside className="teacher-tool-rail" aria-label="教師工具">
      {tools.map((tool) => <button key={tool.id} type="button" className={activeTool === tool.id ? "active" : ""} onClick={() => onSelect(tool.id)} aria-label={tool.label} data-tooltip={tool.label}><span aria-hidden="true">{tool.icon}</span></button>)}
    </aside>
  );
}

function ClassroomToolPopover({ activeTool, onClose, soundOn, annotationTool, annotationColor, annotationSize, onAnnotationTool, onAnnotationColor, onAnnotationSize, onClear, onExport, exporting, exportNotice, externalPractice }) {
  const title = activeTool === "raffle" ? "抽籤" : activeTool === "timer" ? "倒數" : "畫筆工具";
  const compactDraw = activeTool === "draw";
  return (
    <aside className={"classroom-tool-popover " + (compactDraw ? "compact-draw-popover" : "")} aria-label="教師工具面板" aria-hidden={!activeTool}>
      <div className={"tool-popover-heading " + (compactDraw ? "compact-tool-heading" : "")}>{!compactDraw ? <div><p className="tool-label">TEACHER TOOL</p><h2>{title}</h2></div> : null}<button type="button" onClick={onClose} aria-label="關閉工具" data-tooltip={compactDraw ? "關閉畫筆" : undefined}>×</button></div>
      <section className="tool-panel" hidden={activeTool !== "raffle"}><ClassroomRaffle soundOn={soundOn} /></section>
      <section className="tool-panel" hidden={activeTool !== "timer"}><ClassroomTimer soundOn={soundOn} /></section>
      <section className="tool-panel" hidden={activeTool !== "draw"}><AnnotationToolPanel compact={compactDraw} tool={annotationTool} color={annotationColor} size={annotationSize} onTool={onAnnotationTool} onColor={onAnnotationColor} onSize={onAnnotationSize} onClear={onClear} onExport={onExport} exporting={exporting} exportNotice={exportNotice} externalPractice={externalPractice} /></section>
    </aside>
  );
}
function ClassroomRaffle({ soundOn }) {
  const [available, setAvailable] = useState(() => createRafflePool());
  const [history, setHistory] = useState([]);
  const [picked, setPicked] = useState("—");
  const [spinning, setSpinning] = useState(false);
  const tickTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const soundOnRef = useRef(soundOn);

  function clearSpinTimers() {
    if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    tickTimerRef.current = null;
    finishTimerRef.current = null;
  }

  useEffect(() => {
    soundOnRef.current = soundOn;
    if (!soundOn) stopRaffleSpin(false);
  }, [soundOn]);

  useEffect(() => () => {
    clearSpinTimers();
    stopRaffleSpin(false);
  }, []);

  function drawOne() {
    if (spinning || !available.length) return;
    const finalNumber = pickRaffleNumber(available);
    setSpinning(true);
    startRaffleSpin(soundOnRef.current);
    tickTimerRef.current = window.setInterval(() => setPicked(pickRaffleNumber(available)), 78);
    finishTimerRef.current = window.setTimeout(() => {
      clearSpinTimers();
      setPicked(finalNumber);
      setAvailable((current) => removeRaffleNumber(current, finalNumber));
      setHistory((current) => [...current, finalNumber]);
      setSpinning(false);
      stopRaffleSpin(soundOnRef.current);
    }, RAFFLE_DURATION_MS);
  }

  function resetRaffle() {
    if (spinning) return;
    setAvailable(createRafflePool());
    setHistory([]);
    setPicked("—");
  }

  return (
    <div className="raffle-tool">
      <p className="raffle-status">01–30 · 剩下 {available.length} 位</p>
      <strong className={"raffle-number " + (spinning ? "spinning" : "")} aria-live="polite">{picked}</strong>
      <button className="primary-button full-button raffle-draw-button" onClick={drawOne} disabled={spinning || !available.length}>{spinning ? "抽選中…" : available.length ? "抽一位" : "本輪已抽完"}</button>
      <button className="tool-secondary-button" onClick={resetRaffle} disabled={spinning}>重新開始</button>
      {history.length ? <div className="raffle-history"><span>已抽：</span>{history.map((value, index) => <b key={`${value}-${index}`}>{value}</b>)}</div> : <p className="tool-hint">抽出的號碼本輪不會重複。</p>}
    </div>
  );
}

function ClassroomTimer({ soundOn }) {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const soundOnRef = useRef(soundOn);
  const alarmStartedRef = useRef(false);

  useEffect(() => {
    soundOnRef.current = soundOn;
    if (!soundOn) stopTimerAlarm();
  }, [soundOn]);

  useEffect(() => () => stopTimerAlarm(), []);

  function adjustTimer(change) {
    stopTimerAlarm();
    alarmStartedRef.current = false;
    setSeconds((value) => Math.max(0, value + change));
  }

  function toggleTimer() {
    if (running) {
      setRunning(false);
      return;
    }
    stopTimerAlarm();
    alarmStartedRef.current = false;
    if (seconds <= 0) setSeconds(60);
    prepareTimerAlarm(soundOnRef.current);
    setRunning(true);
  }

  function resetTimer() {
    setRunning(false);
    stopTimerAlarm();
    alarmStartedRef.current = false;
    setSeconds(60);
  }

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          if (!alarmStartedRef.current) {
            alarmStartedRef.current = true;
            startTimerAlarm(soundOnRef.current);
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <div className="timer-tool">
      <strong className="timer-display">{formatClock(seconds)}</strong>
      <div className="timer-controls"><button onClick={() => adjustTimer(30)}>＋30</button><button onClick={() => adjustTimer(-30)}>－30</button><button className="primary-mini" onClick={toggleTimer}>{running ? "Pause" : "Start"}</button><button onClick={resetTimer}>Reset</button></div>
    </div>
  );
}
function AnnotationToolPanel({ compact = false, tool, color, size, onTool, onColor, onSize, onClear, onExport, exporting, exportNotice, externalPractice }) {
  const tools = [
    { id: "select", icon: "↖", label: "互動" },
    { id: "pen", icon: "✎", label: "手繪" },
    { id: "line", icon: "╱", label: "直線" },
    { id: "rectangle", icon: "□", label: "長方形" },
    { id: "circle", icon: "○", label: "圓形" },
    { id: "eraser", icon: "⌫", label: "橡皮擦" }
  ];
  return (
    <div className={"annotation-tool-panel " + (compact ? "compact" : "")}>
      <div className="annotation-tool-grid" role="group" aria-label="畫筆模式">{tools.map((item) => <button key={item.id} type="button" className={tool === item.id ? "active" : ""} onClick={() => onTool(item.id)} aria-label={item.label} data-tooltip={compact ? item.label : undefined}><span aria-hidden="true">{item.icon}</span>{compact ? null : <small>{item.label}</small>}</button>)}</div>
      <div className="annotation-settings"><div className="annotation-color-settings">{compact ? <span className="visually-hidden">顏色</span> : <p className="tool-label">COLOR</p>}<div className="color-dots">{["#ef4444", "#2563eb", "#16a34a", "#f59e0b"].map((value) => <button key={value} type="button" className={color === value ? "selected" : ""} style={{ background: value }} onClick={() => onColor(value)} aria-label={"顏色 " + value} />)}</div></div><label className="size-control">{compact ? <span className="visually-hidden">粗細</span> : "粗細"}<input type="range" min="2" max="14" value={size} onChange={(event) => onSize(Number(event.target.value))} /></label></div>
      <div className="annotation-actions"><button className="tool-secondary-button" onClick={onClear} aria-label="清除全部" data-tooltip={compact ? "清除全部" : undefined}>{compact ? <span aria-hidden="true">⌫</span> : "清除全部"}</button><button className="primary-button" onClick={onExport} disabled={exporting} aria-label="匯出 PNG" data-tooltip={compact ? "匯出 PNG" : undefined}>{compact ? <span aria-hidden="true">{exporting ? "…" : "⇩"}</span> : exporting ? "匯出中…" : "匯出 PNG"}</button></div>
      {compact ? null : <p className="tool-hint">{externalPractice ? "Wayground 是外部網頁；PNG 只會保留您的標註與課程標題。" : "PNG 會包含目前 Lesson Hub 畫面與教師標註。"}</p>}
      {exportNotice ? <p className={"tool-message " + (compact ? "compact-tool-message" : "")}>{exportNotice}</p> : null}
    </div>
  );
}
function AnnotationCanvas({ enabled, tool, color, size, clearToken, pageKey, annotationCanvasRef }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const startPointRef = useRef(null);
  const lastPointRef = useRef(null);
  const snapshotRef = useRef(null);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const previous = document.createElement("canvas");
    previous.width = canvas.width;
    previous.height = canvas.height;
    if (previous.width && previous.height) previous.getContext("2d").drawImage(canvas, 0, 0);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    if (previous.width && previous.height) context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, bounds.width, bounds.height);
  }

  useEffect(() => {
    annotationCanvasRef.current = canvasRef.current;
    resizeCanvas();
    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resizeCanvas);
    if (canvas?.parentElement) observer?.observe(canvas.parentElement);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      annotationCanvasRef.current = null;
    };
  }, [annotationCanvasRef]);

  useEffect(() => {
    clearCanvas();
  }, [clearToken, pageKey]);

  function pointFromEvent(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function applyStroke(context, activeTool) {
    context.globalCompositeOperation = activeTool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = activeTool === "eraser" ? Math.max(12, size * 3) : size;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  function drawShape(context, activeTool, start, end) {
    context.beginPath();
    if (activeTool === "line") {
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    } else if (activeTool === "rectangle") {
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      return;
    } else if (activeTool === "circle") {
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      context.ellipse(centerX, centerY, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2);
    }
    context.stroke();
  }

  function startDrawing(event) {
    if (!enabled) return;
    event.preventDefault();
    const start = pointFromEvent(event);
    const context = canvasRef.current.getContext("2d");
    drawingRef.current = true;
    startPointRef.current = start;
    lastPointRef.current = start;
    if (tool === "pen" || tool === "eraser") {
      applyStroke(context, tool);
      context.beginPath();
      context.arc(start.x, start.y, Math.max(1, context.lineWidth / 2), 0, Math.PI * 2);
      context.fill();
    } else {
      snapshotRef.current = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function draw(event) {
    if (!enabled || !drawingRef.current || !lastPointRef.current) return;
    event.preventDefault();
    const current = pointFromEvent(event);
    const context = canvasRef.current.getContext("2d");
    if (tool === "pen" || tool === "eraser") {
      applyStroke(context, tool);
      context.beginPath();
      context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      context.lineTo(current.x, current.y);
      context.stroke();
      lastPointRef.current = current;
      return;
    }
    if (snapshotRef.current) context.putImageData(snapshotRef.current, 0, 0);
    applyStroke(context, tool);
    drawShape(context, tool, startPointRef.current, current);
    lastPointRef.current = current;
  }

  function stopDrawing(event) {
    if (!drawingRef.current) return;
    draw(event);
    drawingRef.current = false;
    startPointRef.current = null;
    lastPointRef.current = null;
    snapshotRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <canvas ref={canvasRef} className={"annotation-canvas " + (enabled ? "drawing" : "")} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} aria-label="教師畫筆畫布" />;
}

function TeachingDock({ current, total, onHome, onPrevious, onNext, onResults }) {
  const atEnd = current === total - 1;
  return (
    <nav className="teaching-dock" aria-label="Teaching Dock">
      <button onClick={onHome}>⌂<span>Home</span></button>
      <button onClick={onPrevious} disabled={current === 0}>←<span>Previous</span></button>
      <span className="dock-progress">{current + 1} / {total}</span>
      <button className="dock-next" onClick={onNext}>{atEnd ? "✓" : "→"}<span>{atEnd ? "Finish Lesson" : "Next"}</span></button>
      <button onClick={onResults}>▤<span>Results</span></button>
    </nav>
  );
}
function StepRenderer({ step, mode, lesson, soundOn, onSaveResult }) {
  if (step.type === "warmup") {
    return <ContentCard icon="👋" title={step.title}><p className="warmup-text">{step.content.body || "Add a warm-up in Lesson Studio."}</p></ContentCard>;
  }
  if (step.type === "ebook") {
    if (mode === "student" && step.content.teacherOnly) {
      return <ContentCard icon="📘" title="電子書限教師端"><p>學生端 iPad Safari 不顯示電子書。請跟著教師螢幕進行課堂活動。</p></ContentCard>;
    }
    if (!step.content.url) {
      return <ContentCard icon="📘" title={step.title}><p>尚未設定 E-book URL。教師可在 Lesson Studio 貼上網址並儲存。</p></ContentCard>;
    }
    return (
      <section className="content-card ebook-launch-card">
        <div className="content-card-heading">
          <div><span className="content-icon">📘</span><div><p className="eyebrow">Teacher-only material</p><h2>{step.content.displayName || step.title}</h2></div></div>
        </div>
        <div className="ebook-launch-panel">
          <span className="ebook-launch-icon" aria-hidden="true">↗</span>
          <div className="ebook-launch-copy">
            <p className="eyebrow">Hanlin e-book catalog</p>
            <h3>在新分頁開啟穩定目錄</h3>
            <p>使用同一個瀏覽器開啟，可沿用目前的翰林登入狀態，再選擇 HWG7 Unit 1。</p>
          </div>
          <a className="primary-button large-button ebook-launch-action" href={step.content.url} target="_blank" rel="noopener noreferrer">開啟 HWG7 第七冊目錄</a>
        </div>
        <p className="embed-note">若翰林登入狀態已過期，平台可能要求重新登入；Lesson Hub 不會儲存帳密或授權資料。</p>
      </section>
    );
  }
  if (step.type === "video") {
    return <VideoStep step={step} />;
  }
  if (step.type === "presentation") {
    return <PresentationStep step={step} />;
  }
  if (step.type === "imageSlides") {
    return <SlideDeck step={step} />;
  }
  if (step.type === "webPractice") {
    return <WebPracticeStep step={step} />;
  }
  if (!step.content.quizEnabled) {
    return <ContentCard icon="🏆" title={step.title}><p>這張 Lesson Card 尚未指定 Quiz 題庫。請在 Lesson Studio 啟用後再使用。</p></ContentCard>;
  }
  return <QuizExperience lesson={lesson} bank={questionBank} soundOn={soundOn} onSaveResult={onSaveResult} />;
}

function ContentCard({ icon, title, children }) {
  return (
    <section className="content-card">
      <div className="content-card-heading"><span className="content-icon">{icon}</span><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function VideoStep({ step }) {
  const [pointA, setPointA] = useState("");
  const [pointB, setPointB] = useState("");
  const uploadedPath = String(step.content?.uploadedMedia?.path || "");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    let active = true;
    setUploadedUrl("");
    setMediaError("");
    if (!uploadedPath) return () => { active = false; };
    resolveTeacherMediaUrl(uploadedPath)
      .then((url) => { if (active) setUploadedUrl(url); })
      .catch(() => { if (active) setMediaError("影片教材暫時無法開啟，請重新整理後再試。"); });
    return () => { active = false; };
  }, [uploadedPath]);

  const sourceUrl = uploadedPath ? uploadedUrl : step.content.url || "";
  const emptyMessage = mediaError || (uploadedPath ? "影片教材載入中…" : "影片素材尚未設定");
  return (
    <section className="content-card video-card">
      <div className="content-card-heading"><span className="content-icon">🎬</span><h2>{step.title}</h2></div>
      {sourceUrl ? <TeachingVideoPlayer source={sourceUrl} title={step.title} /> : <div className="video-placeholder">{emptyMessage}<br /><small>{mediaError || uploadedPath ? "" : "可在 Lesson Studio 上傳 MP4 或貼入 HTTPS 影片網址。"}</small></div>}
      {step.content.abRepeat ? (
        <div className="ab-repeat">
          <strong>AB Repeat</strong>
          <label>A<input value={pointA} onChange={(event) => setPointA(event.target.value)} placeholder="00:10" /></label>
          <label>B<input value={pointB} onChange={(event) => setPointB(event.target.value)} placeholder="00:18" /></label>
          <button className="secondary-button" disabled={!sourceUrl}>Loop A–B</button>
        </div>
      ) : null}
    </section>
  );
}

function SlideDeck({ step }) {
  const slides = step.content.slides || [];
  const [slideIndex, setSlideIndex] = useState(0);
  const pointerStart = useRef(null);

  useEffect(() => {
    setSlideIndex(0);
  }, [slides.join("|")]);

  if (!slides.length) {
    return <ContentCard icon="🖼️" title={step.title}><p>尚未設定圖片。可在 Lesson Studio 逐行貼上圖片路徑，並拖曳 Step 調整教學流程。</p></ContentCard>;
  }

  function next() {
    setSlideIndex((index) => Math.min(slides.length - 1, index + 1));
  }

  function previous() {
    setSlideIndex((index) => Math.max(0, index - 1));
  }

  return (
    <section className="slides-step">
      <div className="content-card-heading">
        <div><span className="content-icon">🖼️</span><div><p className="eyebrow">Manual slide controls only</p><h2>{step.title}</h2></div></div>
        <span className="slide-count">{slideIndex + 1} / {slides.length}</span>
      </div>
      <div
        className="slide-frame"
        onPointerDown={(event) => { pointerStart.current = event.clientX; }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          if (distance > 40) previous();
          if (distance < -40) next();
          pointerStart.current = null;
        }}
      >
        <img src={slides[slideIndex]} alt={"Vocabulary slide " + (slideIndex + 1)} />
      </div>
      <div className="slide-controls">
        <button className="secondary-button" onClick={previous} disabled={slideIndex === 0}>← Previous slide</button>
        <button className="primary-button" onClick={next} disabled={slideIndex === slides.length - 1}>Next slide →</button>
      </div>
    </section>
  );
}

function WebPracticeStep({ step }) {
  if (!step.content.url) {
    return <ContentCard icon="🌐" title={step.title}><p>尚未設定 Live Practice URL。</p></ContentCard>;
  }

  async function requestPracticeFullscreen(event) {
    const stage = event.currentTarget.closest(".lesson-stage");
    if (!stage?.requestFullscreen) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await stage.requestFullscreen();
    } catch {
      // The normal in-page projection layout remains available.
    }
  }
  return (
    <section className="embed-step">
      <div className="content-card-heading">
        <div><span className="content-icon">🌐</span><div><p className="eyebrow">External practice</p><h2>{step.content.displayName || step.title}</h2></div></div>
        <button type="button" className="secondary-button projector-fullscreen-button" onClick={requestPracticeFullscreen}>⛶ <span>全螢幕</span></button>
        <a className="secondary-button" href={step.content.url} target="_blank" rel="noreferrer">新分頁開啟</a>
      </div>
      <iframe title={step.content.displayName || step.title} src={step.content.url} loading="lazy" />
      <p className="embed-note">若平台不允許內嵌，請使用新分頁開啟。</p>
    </section>
  );
}

function QuizExperience({ lesson, bank, soundOn, onSaveResult, studentOnly = false }) {
  const questionSets = bank.questionSets;
  const [phase, setPhase] = useState("gate");
  const [studentId, setStudentId] = useState("");
  const [gateError, setGateError] = useState("");
  const [setIndex, setSetIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const responsesRef = useRef({});
  const [rewardSessions, setRewardSessions] = useState([]);
  const [rewardDialog, setRewardDialog] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [celebrating, setCelebrating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [runId, setRunId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finalResult, setFinalResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedStorage, setSavedStorage] = useState("");
  const celebrationTimer = useRef(null);

  const currentSet = questionSets[setIndex];
  const currentQuestion = currentSet ? currentSet.questions[questionIndex] : null;
  const shuffledOptions = useMemo(() => currentQuestion ? shuffleOptions(currentQuestion.options) : [], [currentQuestion?.id]);
  const studentEntryUrl = useMemo(() => {
    const baseUrl = resolveStudentBaseUrl({
      origin: window.location.origin,
      productionBaseUrl: source.studentEntry.productionBaseUrl,
      localLanBaseUrl: source.studentEntry.localLanBaseUrl
    });
    return buildStudentEntryUrl({ baseUrl, bookId: lesson.bookId, unitId: lesson.unitId, lessonNumber: lesson.lessonNumber });
  }, [lesson.bookId, lesson.lessonNumber, lesson.unitId]);

  useEffect(() => () => {
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
  }, []);

  function startQuiz() {
    const normalized = studentId.trim();
    if (!validateStudentId(normalized)) {
      setGateError(`請輸入五碼學號，例如 ${source.studentIdPolicy.example}；座號須為 01–30。`);
      return;
    }
    setStudentId(normalized);
    setGateError("");
    prepareQuizAudio(soundOn);
    setRunId(createRunId());
    setStartedAt(new Date().toISOString());
    setSetIndex(0);
    setQuestionIndex(0);
    setResponses({});
    responsesRef.current = {};
    setRewardSessions([]);
    setFinalResult(null);
    setSaveError("");
    setSavedStorage("");
    setPhase("active");
  }

  function recordAnswer(answer, isCorrect) {
    const current = responsesRef.current[currentQuestion.id] || { attemptCount: 0, firstAnswer: null, firstAttemptCorrect: null, finalAnswer: null };
    const next = { ...current, attemptCount: current.attemptCount + 1, finalAnswer: answer };
    if (!current.firstAnswer) {
      next.firstAnswer = answer;
      next.firstAttemptCorrect = isCorrect;
    }
    const updated = { ...responsesRef.current, [currentQuestion.id]: next };
    responsesRef.current = updated;
    setResponses(updated);
  }

  function chooseAnswer(answer) {
    if (locked || rewardDialog || !currentQuestion || saving) return;
    const isCorrect = answer === currentQuestion.correctAnswer;
    recordAnswer(answer, isCorrect);
    if (!isCorrect) {
      setFeedback({ kind: "wrong", message: "Try again. You can listen or look one more time." });
      playTone(soundOn, 280, 0.08);
      return;
    }
    setFeedback({ kind: "correct", message: "Great job!" });
    setLocked(true);
    setCelebrating(true);
    playQuizCorrectChime(soundOn);
    celebrationTimer.current = window.setTimeout(() => {
      setCelebrating(false);
      setFeedback(null);
      setLocked(false);
      advanceAfterCorrect();
    }, 1200);
  }

  function advanceAfterCorrect() {
    const completedQuestions = questionIndex + 1;
    const checkpoint = checkpointForProgress(completedQuestions, currentSet.questions.length);
    if (checkpoint !== null) {
      setRewardDialog({ rewardSessionId: `${runId}-${currentSet.id}-${checkpoint}`, mode: currentSet.id, checkpoint, completedQuestions, totalQuestions: currentSet.questions.length });
      return;
    }
    setQuestionIndex((value) => value + 1);
  }

  function buildResult(completedSessions) {
    const summary = summarizeResponses(questionSets, responsesRef.current);
    const completedAt = new Date().toISOString();
    return {
      id: runId,
      sessionId: runId,
      quizId: bank.lesson.quizId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      bookId: lesson.bookId,
      unitId: lesson.unitId,
      lessonNumber: lesson.lessonNumber,
      studentId,
      startedAt,
      completedAt,
      durationSeconds: Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)),
      status: "completed",
      practiceScore: summary.practiceScore,
      practiceMaxScore: summary.totalQuestions,
      finalCorrectCount: summary.finalCorrectCount,
      accuracy: Math.round((summary.practiceScore / summary.totalQuestions) * 100),
      typeA: summary.perType["type-a"],
      typeB: summary.perType["type-b"],
      slotScore: calculateSlotScore(completedSessions),
      rewardSessions: completedSessions,
      answers: responsesRef.current
    };
  }

  async function persistResult(result) {
    setSaving(true);
    setSaveError("");
    try {
      const outcome = await onSaveResult(result);
      setSavedStorage(outcome?.storage || "local");
      setFinalResult(result);
      setPhase("complete");
    } catch (error) {
      setFinalResult(result);
      setSaveError(error?.message || "作答結果暫時無法保存，請先檢查網路後再重試。");
      setPhase("save-failed");
    } finally {
      setSaving(false);
    }
  }

  function finishQuiz(completedSessions) {
    persistResult(buildResult(completedSessions));
  }

  function completeRewardSession(spins) {
    const session = {
      rewardSessionId: rewardDialog.rewardSessionId,
      mode: rewardDialog.mode,
      checkpoint: rewardDialog.checkpoint,
      spins,
      totalSlotScore: spins.reduce((total, spin) => total + spin.score, 0),
      completed: true,
      completedAt: new Date().toISOString()
    };
    const completedSessions = [...rewardSessions, session];
    setRewardSessions(completedSessions);
    setRewardDialog(null);
    const atEndOfType = questionIndex + 1 === currentSet.questions.length;
    if (atEndOfType) {
      if (setIndex + 1 === questionSets.length) finishQuiz(completedSessions);
      else { setSetIndex((value) => value + 1); setQuestionIndex(0); }
    } else {
      setQuestionIndex((value) => value + 1);
    }
  }

  function restart() {
    setPhase("gate");
    setStudentId("");
    setGateError("");
    setFinalResult(null);
    setRewardSessions([]);
    setResponses({});
    responsesRef.current = {};
    setSaveError("");
    setSavedStorage("");
  }

  if (phase === "gate") {
    const studentIdLabel = formatStudentId(studentId);
    return (
      <section className={`quiz-shell gate-card ${!studentOnly && studentEntryUrl ? "teacher-quiz-gate" : ""}`}>
        <QuizMascot />
        {!studentOnly && studentEntryUrl ? <aside className="quiz-entry-qr"><QrCodeImage value={studentEntryUrl} className="quiz-entry-qr-image" width={180} /><strong>掃碼開始 Quiz</strong></aside> : null}
        <div className="quiz-gate-content">
          <span className="quiz-kicker">Vocabulary Quiz</span>
          <h2>Ready to play?</h2>
          <label className="student-id-field"><span>輸入學號</span><input className="student-id-input" inputMode="numeric" maxLength="5" value={studentId} onChange={(event) => setStudentId(event.target.value.replace(/\D/g, ""))} placeholder={source.studentIdPolicy.example} /></label>
          {studentIdLabel ? <p className="student-id-preview"><strong>{studentId}</strong><span>{studentIdLabel}</span></p> : null}
          {gateError ? <p className="form-error">{gateError}</p> : null}
          <button className="primary-button large-button" onClick={startQuiz}>Start Vocabulary Quiz</button>
        </div>
      </section>
    );
  }

  if ((phase === "complete" || phase === "save-failed") && finalResult) {
    return <QuizResult result={finalResult} onRestart={restart} saving={saving} saveError={saveError} savedStorage={savedStorage} onRetrySave={() => persistResult(finalResult)} soundOn={soundOn} />;
  }

  const completedInSet = questionIndex;
  return (
    <section className="quiz-shell">
      <QuizMascot />
      <div className="quiz-header"><div><span className="quiz-kicker">{currentSet.label}</span><h2>{currentSet.prompt}</h2></div><div className="quiz-stats"><strong>{studentId}</strong><span>{completedInSet + 1} / {currentSet.questions.length}</span></div></div>
      <div className="quiz-progress-track"><span style={{ width: `${(completedInSet / currentSet.questions.length) * 100}%` }} /></div>
      {currentSet.id === "type-a" ? <div className="quiz-image-wrap"><img src={bank.assets.images.items[currentQuestion.assetFilename].plannedWebsitePath} alt="Look and choose country" /></div> : <AudioQuestion source={bank.assets.audio.items[currentQuestion.assetFilename].plannedWebsitePath} />}
      <div className="option-grid">{shuffledOptions.map((option) => <button key={option} className="quiz-option" disabled={locked || saving} onClick={() => chooseAnswer(option)}>{option}</button>)}</div>
      {feedback ? <p className={`quiz-feedback ${feedback.kind}`}>{feedback.message}</p> : null}
      <div className="score-strip"><span>Practice Score（first answer）: {summarizeResponses(questionSets, responses).practiceScore} / {questionSets.reduce((total, set) => total + set.questions.length, 0)}</span><span>Slot Reward: {calculateSlotScore(rewardSessions)}</span></div>
      {celebrating ? <CelebrationOverlay /> : null}
      {rewardDialog ? <RewardSlotMachine session={rewardDialog} rewardConfig={source.rewardConfig} soundOn={soundOn} onComplete={completeRewardSession} /> : null}
    </section>
  );
}
function QuizMascot() {
  return <img className="quiz-corner-mascot" src="/assets/mascots/word-master-monster-v1.png" alt="" aria-hidden="true" />;
}
function AudioQuestion({ source }) {
  return (
    <div className="audio-question">
      <span>🔊</span>
      <div>
        <strong>Listen carefully.</strong>
        <p>可重複播放音檔，再選出國家。</p>
      </div>
      <audio controls src={source} preload="metadata" />
    </div>
  );
}

function CelebrationOverlay() {
  return (
    <div className="celebration-overlay" role="status" aria-live="polite">
      <div className="celebration-card">
        <div className="confetti">✨ ⭐ 🎉 🏆 ✨</div>
        <strong>Great job!</strong>
        <span>你答對了！</span>
      </div>
    </div>
  );
}

function RewardSlotMachine({ session, rewardConfig, soundOn, onComplete }) {
  const [reels, setReels] = useState(["❓", "❓", "❓"]);
  const [spins, setSpins] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);
  const chimeTimerRef = useRef(null);
  const spinningRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (chimeTimerRef.current) window.clearTimeout(chimeTimerRef.current);
  }, []);

  function spin() {
    if (spinningRef.current || spins.length >= rewardConfig.spinsPerCheckpoint) return;
    const finalSymbols = rewardConfig.reelTicks.map(() => rewardConfig.symbols[Math.floor(Math.random() * rewardConfig.symbols.length)]);
    const tickCounts = [0, 0, 0];
    const settled = new Set();
    const maxTicks = Math.max(...rewardConfig.reelTicks);
    spinningRef.current = true;
    setSpinning(true);
    prepareSlotAudio(soundOn);

    const nextTick = () => {
      const activeIndexes = [];
      tickCounts.forEach((tick, index) => {
        if (tick < rewardConfig.reelTicks[index]) {
          tickCounts[index] += 1;
          activeIndexes.push(index);
          if (tickCounts[index] === rewardConfig.reelTicks[index]) {
            settled.add(index);
            playReelStop(soundOn, index);
          }
        }
      });
      const progress = Math.max(...tickCounts) / maxTicks;
      setReels(tickCounts.map((tick, index) => tick >= rewardConfig.reelTicks[index] ? finalSymbols[index] : rewardConfig.symbols[Math.floor(Math.random() * rewardConfig.symbols.length)]));
      if (activeIndexes.length) playSlotTick(soundOn, progress);
      if (settled.size === rewardConfig.reelTicks.length) {
        timerRef.current = null;
        const score = scoreSpin(finalSymbols);
        setSpins((current) => [...current, { symbols: finalSymbols, score, reelTicks: rewardConfig.reelTicks }]);
        spinningRef.current = false;
        setSpinning(false);
        chimeTimerRef.current = window.setTimeout(() => playRewardChime(soundOn, score === 100), 140);
        return;
      }
      const delay = Math.round(32 + Math.pow(progress, 1.75) * 108);
      timerRef.current = window.setTimeout(nextTick, delay);
    };
    nextTick();
  }

  function finishChallenge() {
    if (submitted || spins.length !== rewardConfig.spinsPerCheckpoint || spinningRef.current) return;
    setSubmitted(true);
    onComplete(spins);
  }

  const checkpointLabel = session.checkpoint === 0.5 ? "50%" : "100%";
  const total = spins.reduce((sum, spin) => sum + spin.score, 0);
  return (
    <div className="reward-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reward Slot Machine">
      <section className="slot-machine">
        <p className="quiz-kicker">Reward Session · {session.mode.toUpperCase()} · {checkpointLabel}</p>
        <h2>🎰 Reward Slot Machine</h2>
        <div className={`slot-reels ${spinning ? "spinning" : ""}`}>{reels.map((symbol, index) => <div key={index} className="reel"><small>{rewardConfig.reelTicks[index]} ticks</small><strong>{symbol}</strong></div>)}</div>
        <div className="slot-summary"><span>SPIN {spins.length} / {rewardConfig.spinsPerCheckpoint}</span><strong>Session Reward: {total}</strong></div>
        <div className="slot-history">{spins.map((spin, index) => <span key={index}>{spin.symbols.join(" ")} = {spin.score}</span>)}</div>
        <div className="slot-actions"><button className="primary-button large-button" onClick={spin} disabled={spinning || spins.length >= rewardConfig.spinsPerCheckpoint}>SPIN</button><button className="secondary-button" onClick={finishChallenge} disabled={spinning || spins.length !== rewardConfig.spinsPerCheckpoint || submitted}>完成闖關</button></div>
      </section>
    </div>
  );
}
function QuizResult({ result, onRestart, saving, saveError, savedStorage, onRetrySave, soundOn }) {
  const savedMessage = savedStorage === "firestore" ? "結果已安全保存到 Firestore（僅匿名 Student ID）。" : "結果已保存到這台瀏覽器的 Preview 資料層。";
  const studentIdLabel = formatStudentId(result.studentId);
  const [celebrationActive, setCelebrationActive] = useState(true);
  const celebrationEndsAt = useRef(Date.now() + QUIZ_COMPLETION_DURATION_MS);

  useEffect(() => {
    celebrationEndsAt.current = Date.now() + QUIZ_COMPLETION_DURATION_MS;
    setCelebrationActive(true);
    const timer = window.setTimeout(() => setCelebrationActive(false), QUIZ_COMPLETION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [result.sessionId]);

  useEffect(() => {
    const remaining = Math.max(0, celebrationEndsAt.current - Date.now());
    if (celebrationActive && remaining > 0) startQuizCelebration(soundOn, remaining);
    else stopQuizCelebration();
    return () => stopQuizCelebration();
  }, [celebrationActive, result.sessionId, soundOn]);

  const confetti = ["🎉", "⭐", "✨", "💛", "🟣", "🟢", "🎊", "⭐", "✨", "💙", "🩷", "🟡", "🎉", "⭐", "✨", "💚"];
  return (
    <section className={`quiz-shell result-card quiz-complete-card ${celebrationActive ? "celebrating" : ""}`}>
      <QuizMascot />
      <div className="completion-confetti" aria-hidden="true">{confetti.map((symbol, index) => <span key={index} style={{ "--confetti-left": `${5 + ((index * 17) % 90)}%`, "--confetti-delay": `${-(index % 5) * 0.38}s`, "--confetti-drift": `${(index % 2 ? 1 : -1) * (24 + (index % 4) * 12)}px` }}>{symbol}</span>)}</div>
      <div className="completion-content">
        <span className="quiz-kicker">Quiz complete</span>
        <h2>完成闖關！</h2>
        <div className="completed-student-id"><span>學號</span><strong>{result.studentId}</strong>{studentIdLabel ? <small>{studentIdLabel}</small> : null}</div>
        <div className="result-score-grid"><div><small>Practice Score</small><strong>{result.practiceScore} / {result.practiceMaxScore}</strong><span>First-answer accuracy {result.accuracy}%</span></div><div><small>Final correct</small><strong>{result.finalCorrectCount} / {result.practiceMaxScore}</strong><span>重試後完成的題數</span></div><div><small>Slot Reward</small><strong>{result.slotScore}</strong><span>{result.rewardSessions.length} completed sessions</span></div></div>
        <div className="type-result-row"><span>Look and choose: {result.typeA.firstAttemptCorrectCount} / {result.typeA.totalQuestions}</span><span>Listen and choose: {result.typeB.firstAttemptCorrectCount} / {result.typeB.totalQuestions}</span></div>
        {saveError ? <div className="save-error"><strong>尚未保存作答結果</strong><p>{saveError}</p><button className="primary-button" onClick={onRetrySave} disabled={saving}>{saving ? "重新保存中…" : "重新保存"}</button></div> : <p className="save-success">{savedMessage}</p>}
        <button className="primary-button" onClick={onRestart} disabled={saving}>下一位學生</button>
      </div>
    </section>
  );
}
function ResultsDashboard({ localResults, lessons, onBack, onClearLocal }) {
  const [queryText, setQueryText] = useState("");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [remoteResults, setRemoteResults] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastExportId, setLastExportId] = useState("");
  const [lastExportedIds, setLastExportedIds] = useState([]);
  const [exportFormat, setExportFormat] = useState("csv");
  const usingFirebase = isFirebaseConfigured;
  const results = usingFirebase ? remoteResults : localResults;

  const filtered = results.filter((result) => {
    const matchesQuery = String(result.studentId || "").includes(queryText.trim());
    const matchesLesson = lessonFilter === "all" || result.lessonId === lessonFilter;
    return matchesQuery && matchesLesson;
  });

  function resetExportEligibility() {
    setLastExportId("");
    setLastExportedIds([]);
  }

  async function signInAndLoad(event) {
    event?.preventDefault();
    if (!passcode) {
      setError("請輸入六位數教師通行碼。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await unlockTeacherSession(passcode);
      const loaded = await loadTeacherResults();
      setTeacher(session);
      setRemoteResults(loaded);
      setMessage(`已讀取 ${loaded.length} 筆匿名作答結果。`);
    } catch (cause) {
      setError(cause?.message || "教師通行碼或讀取結果失敗。");
    } finally {
      setPasscode("");
      setLoading(false);
    }
  }

  async function refresh() {
    if (!usingFirebase) return;
    setLoading(true);
    setError("");
    try {
      const loaded = await loadTeacherResults();
      setRemoteResults(loaded);
      resetExportEligibility();
      setMessage(`已更新 ${loaded.length} 筆匿名作答結果。`);
    } catch (cause) {
      setError(cause?.message || "無法更新結果。");
    } finally {
      setLoading(false);
    }
  }

  async function exportResults() {
    if (!filtered.length) {
      setError("目前沒有可匯出的結果。");
      return;
    }
    const resultIds = filtered.map((result) => result.id || result.sessionId).filter(Boolean);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const text = exportFormat === "json" ? resultsToJson(filtered) : resultsToCsv(filtered);
    setLoading(true);
    setError("");
    // Start the browser download in the button-click event before awaiting the server audit call.
    downloadExport({ filename: `lesson-hub-results-${stamp}.${exportFormat}`, text, mimeType: exportFormat === "json" ? "application/json" : "text/csv" });
    try {
      const event = await recordExportEvent({ format: exportFormat, resultIds, queryLabel: lessonFilter === "all" ? "all" : `lesson:${lessonFilter}` });
      setLastExportId(event.id);
      setLastExportedIds(resultIds);
      setMessage(`已啟動 ${exportFormat.toUpperCase()} 匯出；現在才可刪除本次匯出的 ${event.recordCount || resultIds.length} 筆資料。`);
    } catch (cause) {
      setError(cause?.message || "匯出檔已產生，但安全匯出紀錄失敗，因此無法刪除資料。");
      resetExportEligibility();
    } finally {
      setLoading(false);
    }
  }

  async function deleteAfterExport() {
    if (!lastExportId || !lastExportedIds.length) {
      setError("請先完成本次結果匯出，才可刪除。");
      return;
    }
    if (!window.confirm(`已匯出 ${lastExportedIds.length} 筆結果。確定要刪除這批已匯出的資料嗎？`)) return;
    setLoading(true);
    setError("");
    try {
      if (usingFirebase) {
        const deleted = await deleteResultsAfterExport({ resultIds: lastExportedIds, exportId: lastExportId });
        const deletedIds = new Set(lastExportedIds);
        setRemoteResults((current) => current.filter((result) => !deletedIds.has(result.id || result.sessionId)));
        setMessage(`已刪除 ${deleted} 筆已匯出結果。`);
      } else {
        onClearLocal(lastExportedIds);
        setMessage("已清除本機 Preview 中這次匯出的 Results。\n");
      }
      resetExportEligibility();
    } catch (cause) {
      setError(cause?.message || "刪除失敗，資料仍保留。\n");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    try {
      await teacherSignOut();
      setTeacher(null);
      setRemoteResults([]);
      resetExportEligibility();
      setShowPasscodeForm(false);
      setMessage("已關閉 Results 工作階段。\n");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="results-page">
      <div className="results-header">
        <div><p className="eyebrow">Teacher-only results</p><h1>{usingFirebase ? "Results" : "Local Preview Results"}</h1></div>
        <div className="editor-actions"><button className="secondary-button" onClick={onBack}>回 Teacher Studio</button>{usingFirebase && teacher ? <button className="icon-text-button" onClick={signOut} disabled={loading}>關閉 Results</button> : null}</div>
      </div>
      {usingFirebase && !teacher ? <section className="teacher-auth-card"><h2>教師成績入口</h2>{!showPasscodeForm ? <><p>按下登入後，再輸入教師共用通行碼即可進入 Results。</p><div className="teacher-login-start"><button className="primary-button large-button" onClick={() => { setShowPasscodeForm(true); setError(""); }}>登入</button></div></> : <><p>請輸入教師共用通行碼。本次開啟有效；重新整理後需要再次輸入。</p><form className="teacher-passcode-form" onSubmit={signInAndLoad}><label>教師共用通行碼<input type="password" inputMode="numeric" autoComplete="off" autoFocus value={passcode} onChange={(event) => setPasscode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="六位數" aria-label="教師共用通行碼" /></label><button className="primary-button large-button" type="submit" disabled={loading || !passcode}>{loading ? "驗證中…" : "開啟 Results"}</button></form></>}</section> : null}
      {message ? <p className="dashboard-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {(!usingFirebase || teacher) ? <>
        <section className="filter-row"><label>Student ID<input value={queryText} onChange={(event) => { setQueryText(event.target.value); resetExportEligibility(); }} placeholder={`例如 ${source.studentIdPolicy.example}`} /></label><label>Lesson<select value={lessonFilter} onChange={(event) => { setLessonFilter(event.target.value); resetExportEligibility(); }}><option value="all">All lessons</option>{lessons.filter((lesson) => lesson.contentProfile !== "placeholder" || lesson.bookId !== "custom").map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label><button className="secondary-button" onClick={refresh} disabled={!usingFirebase || loading}>重新整理</button></section>
        <section className="export-bar"><div><strong>匯出後再刪除</strong><span>本次篩選：{filtered.length} 筆</span></div><div className="export-actions"><select value={exportFormat} onChange={(event) => { setExportFormat(event.target.value); resetExportEligibility(); }}><option value="csv">CSV</option><option value="json">JSON</option></select><button className="secondary-button" onClick={exportResults} disabled={loading || !filtered.length}>匯出</button><button className="danger-text-button" onClick={deleteAfterExport} disabled={loading || !lastExportId}>刪除已匯出資料</button></div></section>
        <section className="results-table-wrap"><table><thead><tr><th>Student ID</th><th>Lesson</th><th>Practice Score</th><th>Accuracy</th><th>Slot Reward</th><th>Look and choose</th><th>Listen and choose</th><th>Time</th></tr></thead><tbody>{filtered.length ? filtered.map((result) => <tr key={result.id || result.sessionId}><td><span className="results-student-id"><strong>{result.studentId}</strong><small>{formatStudentId(result.studentId)}</small></span></td><td>{result.lessonTitle || result.lessonId}</td><td>{result.practiceScore} / {result.practiceMaxScore}</td><td>{result.accuracy}%</td><td>{result.slotScore}</td><td>{result.typeA?.firstAttemptCorrectCount} / {result.typeA?.totalQuestions}</td><td>{result.typeB?.firstAttemptCorrectCount} / {result.typeB?.totalQuestions}</td><td>{result.completedAt ? new Date(result.completedAt).toLocaleString("zh-TW") : "—"}</td></tr>) : <tr><td colSpan="8" className="empty-table">尚無符合條件的匿名作答結果。</td></tr>}</tbody></table></section>
      </> : null}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
