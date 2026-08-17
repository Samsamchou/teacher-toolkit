import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "@fontsource/comic-relief/400.css";
import "@fontsource/comic-relief/700.css";
import "./styles.css";
import {
  createLesson,
  createSeedLessons,
  createStep,
  findLessonByStudentEntry,
  questionBank,
  source,
  stepTypes
} from "./data/lesson-data.js";
import { loadJson, saveJson } from "./lib/local-storage.js";
import { migrateLessonState, migrateResultsForStructure } from "./lib/lesson-migrations.js";
import {
  calculateSlotScore,
  checkpointForProgress,
  createRunId,
  scoreSpin,
  shuffleOptions,
  summarizeResponses,
  validateStudentId
} from "./lib/quiz-logic.js";
import { buildStudentEntryUrl, isLoopbackBaseUrl, parseStudentEntry, resolveStudentBaseUrl } from "./lib/student-entry.js";
import { firebaseStatus, isFirebaseConfigured } from "./lib/firebase-client.js";
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
import { playReelStop, playRewardChime, playSlotTick, prepareSlotAudio } from "./lib/slot-audio.js";
const LESSONS_STORAGE_KEY = "english-lesson-hub-v03-preview.lessons";
const RESULTS_STORAGE_KEY = "english-lesson-hub-v03-preview.results";

const STEP_META = {
  warmup: { icon: "👋", label: "Warm-up" },
  ebook: { icon: "📘", label: "E-book" },
  video: { icon: "🎬", label: "Video" },
  imageSlides: { icon: "🖼️", label: "Slides" },
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
      setNotice("Starter 與 Unit 1–4 的 50 節預設 Lesson 會固定保留；可改用「重設 Lesson」。");
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
    setNotice("Preview 已回復為 10 個單元、每單元 5 節的預設結構。");
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
          onClearLocal={() => {
            if (window.confirm("清除這台瀏覽器中的 Preview Results？")) {
              setResults([]);
              setNotice("本機 Preview Results 已清除。");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function AppHeader({ screen, mode, soundOn, onSoundChange, onStudio, onResults, onModeChange }) {
  const status = firebaseStatus();
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
  if (editingLesson) {
    return <LessonEditor lesson={editingLesson} onSave={(lesson) => { onSave(lesson); onCloseEditor(); }} onCancel={onCloseEditor} />;
  }

  const customLessons = lessons.filter((lesson) => lesson.bookId === "custom");
  return (
    <main className="studio-page">
      <section className="studio-hero">
        <div>
          <p className="eyebrow">Teacher-configurable Lesson Cockpit</p>
          <h1>10 個單元，50 節課，隨時可調整。</h1>
          <p>HWG5 與 HWG7 都有 Starter、Unit 1–4；每個單元先建立 Lesson 1–5。HWG7 是 Grade 6，HWG7 Unit 1 Lesson 1 已保留完整題庫與教師端電子書。</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={onCreate}>＋ New Custom Lesson</button>
          <button className="secondary-button" onClick={onReset}>重設本機 Preview</button>
        </div>
      </section>

      {(source.books || []).map((book) => (
        <section className="book-section" key={book.id}>
          <div className="book-heading"><div><p className="eyebrow">{book.grade}</p><h2>{book.label}</h2></div><span>{book.units.length} Units · {book.units.length * source.lessonTemplate.lessonsPerUnit} Lessons</span></div>
          {book.units.map((unit) => {
            const key = `${book.id}-${unit.id}`;
            const unitLessons = lessons.filter((lesson) => lesson.bookId === book.id && lesson.unitId === unit.id).sort((a, b) => a.lessonNumber - b.lessonNumber);
            const theme = source.unitThemes[key];
            return (
              <section className="unit-section" key={key} style={themeStyle(theme)}>
                <div className="unit-heading"><div><span className="unit-color-dot" /><p>{theme?.name || "Dopamine palette"}</p><h3>{unit.title}</h3></div><span>{unitLessons.length} / {source.lessonTemplate.lessonsPerUnit} Lessons</span></div>
                <div className="lesson-grid" aria-label={`${book.label} ${unit.title} Lesson Cards`}>
                  {unitLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} onStart={onStart} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} onResetLesson={onResetLesson} />)}
                </div>
              </section>
            );
          })}
        </section>
      ))}

      {customLessons.length ? <section className="book-section custom-book-section"><div className="book-heading"><div><p className="eyebrow">Teacher-created</p><h2>Custom Lessons</h2></div></div><div className="lesson-grid">{customLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} onStart={onStart} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} onResetLesson={onResetLesson} />)}</div></section> : null}
    </main>
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

function QrCodeImage({ value }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 260, margin: 1, errorCorrectionLevel: "M", color: { dark: "#15215c", light: "#ffffff" } })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [value]);
  return dataUrl ? <img className="student-qr" src={dataUrl} alt="學生掃碼進入 Vocabulary Quiz" /> : <div className="qr-placeholder">QR</div>;
}
function LessonEditor({ lesson, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => clone(lesson));
  const [newStepType, setNewStepType] = useState("warmup");
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  return (
    <main className="editor-page">
      <div className="editor-title-row">
        <div>
          <p className="eyebrow">Lesson Studio</p>
          <h1>Edit Lesson Flow</h1>
        </div>
        <div className="editor-actions">
          <button className="secondary-button" onClick={onCancel}>取消</button>
          <button className="primary-button" onClick={() => onSave(draft)}>Save Lesson</button>
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
                onChange={(patch) => updateStepContent(index, patch)}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function StepContentFields({ step, onChange }) {
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
      <div className="form-grid two-columns compact-fields">
        <label>Video URL<input value={content.url || ""} onChange={(event) => onChange({ url: event.target.value })} placeholder="可貼入本機或 HTTPS 影片網址" /></label>
        <label className="check-field"><input type="checkbox" checked={Boolean(content.abRepeat)} onChange={(event) => onChange({ abRepeat: event.target.checked })} /> 顯示 AB Repeat 控制</label>
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

function LessonCockpit({ lesson, mode, soundOn, onModeChange, onExit, onResults, onSaveResult }) {
  const steps = lesson.steps.filter((step) => step.enabled);
  const [stepIndex, setStepIndex] = useState(0);
  const [annotationTool, setAnnotationTool] = useState("select");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  const [annotationSize, setAnnotationSize] = useState(5);
  const [clearToken, setClearToken] = useState(0);
  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeIndex];

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

  function goNext() {
    if (safeIndex < steps.length - 1) setStepIndex(safeIndex + 1);
    else onExit();
  }

  return (
    <main className="cockpit-page" style={themeStyle(lesson.theme)}>
      <div className="cockpit-topbar">
        <div><p className="eyebrow">{lesson.book} · {lesson.unit} · Lesson {lesson.lessonNumber}</p><h1>{lesson.title}</h1></div>
        <div className="cockpit-mode-note">教師正在控制 Lesson Flow</div>
      </div>
      <nav className="progress-bar" aria-label="Lesson Progress">
        {steps.map((step, index) => <button key={step.id} className={index === safeIndex ? "active" : ""} onClick={() => setStepIndex(index)}><span>{index + 1}</span><small>{step.title}</small></button>)}
      </nav>
      <div className="cockpit-layout">
        <AnnotationToolbar tool={annotationTool} color={annotationColor} size={annotationSize} onTool={setAnnotationTool} onColor={setAnnotationColor} onSize={setAnnotationSize} onClear={() => setClearToken((value) => value + 1)} />
        <section className="lesson-stage">
          <AnnotationCanvas enabled={annotationTool === "pen"} color={annotationColor} size={annotationSize} clearToken={clearToken} />
          <StepRenderer step={currentStep} mode="teacher" lesson={lesson} soundOn={soundOn} onSaveResult={onSaveResult} />
        </section>
        <ClassroomTools lesson={lesson} />
      </div>
      <TeachingDock current={safeIndex} total={steps.length} onHome={onExit} onPrevious={() => setStepIndex(Math.max(0, safeIndex - 1))} onNext={goNext} onResults={onResults} />
    </main>
  );
}
function AnnotationToolbar({ tool, color, size, onTool, onColor, onSize, onClear }) {
  return (
    <aside className="annotation-toolbar" aria-label="Annotation Toolbar">
      <strong>✏️</strong>
      <button className={tool === "select" ? "active" : ""} onClick={() => onTool("select")} title="選取">↖</button>
      <button className={tool === "pen" ? "active" : ""} onClick={() => onTool("pen")} title="畫筆">✎</button>
      <button onClick={onClear} title="清除畫筆">⌫</button>
      <div className="color-dots">
        {["#ef4444", "#2563eb", "#16a34a", "#f59e0b"].map((value) => (
          <button
            key={value}
            className={color === value ? "selected" : ""}
            style={{ background: value }}
            onClick={() => onColor(value)}
            aria-label={"顏色 " + value}
          />
        ))}
      </div>
      <label className="size-control">粗細
        <input type="range" min="2" max="14" value={size} onChange={(event) => onSize(Number(event.target.value))} />
      </label>
    </aside>
  );
}

function AnnotationCanvas({ enabled, color, size, clearToken }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearToken]);

  function pointFromEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event) {
    if (!enabled) return;
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function draw(event) {
    if (!enabled || !drawingRef.current || !lastPointRef.current) return;
    const current = pointFromEvent(event);
    const context = canvasRef.current.getContext("2d");
    context.strokeStyle = color;
    context.lineWidth = size;
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPointRef.current = current;
  }

  function stopDrawing() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={"annotation-canvas " + (enabled ? "drawing" : "")}
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={stopDrawing}
      onPointerCancel={stopDrawing}
      aria-label="教師畫筆畫布"
    />
  );
}

function ClassroomTools({ lesson }) {
  const gradeCode = String(lesson.grade || "Grade 6").match(/\d/)?.[0] || "6";
  const studentIds = Array.from({ length: 6 }, (_, index) => `${gradeCode}01${String(index + 1).padStart(2, "0")}`);
  const [picked, setPicked] = useState("Ready?");
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) { setRunning(false); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <aside className="classroom-tools" aria-label="Classroom tools">
      <section><p className="tool-label">RANDOM STUDENT</p><strong className="picked-student">{picked}</strong><button className="secondary-button full-button" onClick={() => setPicked(studentIds[Math.floor(Math.random() * studentIds.length)])}>抽一位</button></section>
      <section><p className="tool-label">TIMER</p><strong className="timer-display">{formatClock(seconds)}</strong><div className="timer-controls"><button onClick={() => setSeconds((value) => value + 30)}>＋30</button><button onClick={() => setSeconds((value) => Math.max(0, value - 30))}>－30</button><button className="primary-mini" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Start"}</button><button onClick={() => { setRunning(false); setSeconds(60); }}>Reset</button></div></section>
    </aside>
  );
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
  return (
    <section className="content-card video-card">
      <div className="content-card-heading"><span className="content-icon">🎬</span><h2>{step.title}</h2></div>
      {step.content.url ? <video controls src={step.content.url}>Your browser cannot play this video.</video> : <div className="video-placeholder">影片素材尚未設定<br /><small>可在 Lesson Studio 貼入本機或 HTTPS 影片 URL。</small></div>}
      {step.content.abRepeat ? (
        <div className="ab-repeat">
          <strong>AB Repeat</strong>
          <label>A<input value={pointA} onChange={(event) => setPointA(event.target.value)} placeholder="00:10" /></label>
          <label>B<input value={pointB} onChange={(event) => setPointB(event.target.value)} placeholder="00:18" /></label>
          <button className="secondary-button" disabled={!step.content.url}>Loop A–B</button>
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
  return (
    <section className="embed-step">
      <div className="content-card-heading">
        <div><span className="content-icon">🌐</span><div><p className="eyebrow">External practice</p><h2>{step.content.displayName || step.title}</h2></div></div>
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

  useEffect(() => () => {
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
  }, []);

  function startQuiz() {
    const normalized = studentId.trim();
    if (!validateStudentId(normalized)) {
      setGateError(`請輸入五碼 Student ID，例如 ${source.studentIdPolicy.example}；座號須為 01–30。`);
      return;
    }
    setStudentId(normalized);
    setGateError("");
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
    playTone(soundOn, 880, 0.16);
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
    return (
      <section className="quiz-shell gate-card">
        <span className="quiz-kicker">Native Vocabulary Quiz · {isFirebaseConfigured ? "Secure Firestore" : "Local Preview"}</span>
        <h2>Ready to play?</h2>
        <p>輸入匿名 Student ID 後開始。不會收集姓名；正式部署後，作答資料會以匿名 Auth 與 Firestore 安全規則保護。</p>
        <label>Student ID<input className="student-id-input" inputMode="numeric" maxLength="5" value={studentId} onChange={(event) => setStudentId(event.target.value.replace(/\D/g, ""))} placeholder={source.studentIdPolicy.example} /></label>
        {gateError ? <p className="form-error">{gateError}</p> : null}
        <button className="primary-button large-button" onClick={startQuiz}>Start Vocabulary Quiz</button>
        <small>規則：第一次答案決定 Practice Score；答錯可重試，答對才會慶祝。完成後會保存作答 Session，重複送出不會覆寫分數。</small>
      </section>
    );
  }

  if ((phase === "complete" || phase === "save-failed") && finalResult) {
    return <QuizResult result={finalResult} onRestart={restart} saving={saving} saveError={saveError} savedStorage={savedStorage} onRetrySave={() => persistResult(finalResult)} studentOnly={studentOnly} />;
  }

  const completedInSet = questionIndex;
  return (
    <section className="quiz-shell">
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
        <p>按下 SPIN 後，拉霸音效會從加速轉動、逐軸停止，最後播放獎勵音；完成 4 次後才能保存本次匿名作答結果。</p>
        <div className={`slot-reels ${spinning ? "spinning" : ""}`}>{reels.map((symbol, index) => <div key={index} className="reel"><small>{rewardConfig.reelTicks[index]} ticks</small><strong>{symbol}</strong></div>)}</div>
        <div className="slot-summary"><span>SPIN {spins.length} / {rewardConfig.spinsPerCheckpoint}</span><strong>Session Reward: {total}</strong></div>
        <div className="slot-history">{spins.map((spin, index) => <span key={index}>{spin.symbols.join(" ")} = {spin.score}</span>)}</div>
        <div className="slot-actions"><button className="primary-button large-button" onClick={spin} disabled={spinning || spins.length >= rewardConfig.spinsPerCheckpoint}>SPIN</button><button className="secondary-button" onClick={finishChallenge} disabled={spinning || spins.length !== rewardConfig.spinsPerCheckpoint || submitted}>完成闖關</button></div>
      </section>
    </div>
  );
}
function QuizResult({ result, onRestart, saving, saveError, savedStorage, onRetrySave }) {
  const savedMessage = savedStorage === "firestore" ? "結果已安全保存到 Firestore（僅匿名 Student ID）。" : "結果已保存到這台瀏覽器的 Preview 資料層。";
  return (
    <section className="quiz-shell result-card">
      <span className="quiz-kicker">Quiz complete</span>
      <h2>完成闖關！</h2>
      <p>Student ID: <strong>{result.studentId}</strong></p>
      <div className="result-score-grid"><div><small>Practice Score</small><strong>{result.practiceScore} / {result.practiceMaxScore}</strong><span>First-answer accuracy {result.accuracy}%</span></div><div><small>Final correct</small><strong>{result.finalCorrectCount} / {result.practiceMaxScore}</strong><span>重試後完成的題數</span></div><div><small>Slot Reward</small><strong>{result.slotScore}</strong><span>{result.rewardSessions.length} completed sessions</span></div></div>
      <div className="type-result-row"><span>Type A: {result.typeA.firstAttemptCorrectCount} / {result.typeA.totalQuestions}</span><span>Type B: {result.typeB.firstAttemptCorrectCount} / {result.typeB.totalQuestions}</span></div>
      {saveError ? <div className="save-error"><strong>尚未保存作答結果</strong><p>{saveError}</p><button className="primary-button" onClick={onRetrySave} disabled={saving}>{saving ? "重新保存中…" : "重新保存"}</button></div> : <p className="save-success">{savedMessage}</p>}
      <button className="primary-button" onClick={onRestart} disabled={saving}>下一位學生</button>
    </section>
  );
}
function ResultsDashboard({ localResults, lessons, onBack, onClearLocal }) {
  const [queryText, setQueryText] = useState("");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [remoteResults, setRemoteResults] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastExportId, setLastExportId] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const usingFirebase = isFirebaseConfigured;
  const results = usingFirebase ? remoteResults : localResults;

  const filtered = results.filter((result) => {
    const matchesQuery = String(result.studentId || "").includes(queryText.trim());
    const matchesLesson = lessonFilter === "all" || result.lessonId === lessonFilter;
    return matchesQuery && matchesLesson;
  });

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
      setTeacher(session.user || null);
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
    setLoading(true);
    setError("");
    try {
      if (usingFirebase) await ensureTeacherSession();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const text = exportFormat === "json" ? resultsToJson(filtered) : resultsToCsv(filtered);
      downloadExport({ filename: `lesson-hub-results-${stamp}.${exportFormat}`, text, mimeType: exportFormat === "json" ? "application/json" : "text/csv" });
      const event = await recordExportEvent({ format: exportFormat, count: filtered.length, queryLabel: lessonFilter });
      setLastExportId(event.id);
      setMessage(`已啟動 ${exportFormat.toUpperCase()} 匯出；現在才可刪除本次篩選的 ${filtered.length} 筆資料。`);
    } catch (cause) {
      setError(cause?.message || "匯出失敗，已停止刪除流程。");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAfterExport() {
    if (!filtered.length || !lastExportId) {
      setError("請先完成本次結果匯出，才可刪除。\n");
      return;
    }
    if (!window.confirm(`已匯出 ${filtered.length} 筆結果。確定要刪除目前篩選的資料嗎？`)) return;
    setLoading(true);
    setError("");
    try {
      if (usingFirebase) {
        const deleted = await deleteResultsAfterExport({ resultIds: filtered.map((result) => result.id || result.sessionId), exportId: lastExportId });
        setRemoteResults((current) => current.filter((result) => !filtered.some((item) => (item.id || item.sessionId) === (result.id || result.sessionId))));
        setMessage(`已刪除 ${deleted} 筆已匯出結果。`);
      } else {
        onClearLocal();
        setMessage("已清除本機 Preview Results。正式 Firebase 刪除流程會先要求匯出。\n");
      }
      setLastExportId("");
    } catch (cause) {
      setError(cause?.message || "刪除失敗，資料仍保留。\n");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await teacherSignOut();
    setTeacher(null);
    setRemoteResults([]);
    setLastExportId("");
    setMessage("已關閉教師安全工作階段。");
  }

  return (
    <main className="results-page">
      <div className="results-header">
        <div><p className="eyebrow">Teacher-only results</p><h1>{usingFirebase ? "Firestore Results" : "Local Preview Results"}</h1><p>{usingFirebase ? "輸入教師通行碼後，由伺服器簽發短暫 Teacher Claim。學生無法直接讀取任何作答資料。" : "尚未加入 Firebase 公開 Web App 組態，因此只顯示這台瀏覽器的匿名 Preview Results。"}</p></div>
        <div className="editor-actions"><button className="secondary-button" onClick={onBack}>回 Teacher Studio</button>{usingFirebase && teacher ? <button className="icon-text-button" onClick={signOut}>教師登出</button> : null}</div>
      </div>
      {usingFirebase && !teacher ? <section className="teacher-auth-card"><h2>教師資料庫入口</h2><p>輸入通行碼後，系統會在伺服器端驗證並建立僅限本次瀏覽器工作階段的教師權限。</p><form className="teacher-passcode-form" onSubmit={signInAndLoad}><label>教師通行碼<input type="password" inputMode="numeric" autoComplete="off" value={passcode} onChange={(event) => setPasscode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="六位數" aria-label="教師通行碼" /></label><button className="primary-button large-button" type="submit" disabled={loading || !passcode}>{loading ? "驗證中…" : "開啟成績結果"}</button></form></section> : null}
      {message ? <p className="dashboard-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {(!usingFirebase || teacher) ? <>
        <section className="filter-row"><label>Student ID<input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder={`例如 ${source.studentIdPolicy.example}`} /></label><label>Lesson<select value={lessonFilter} onChange={(event) => { setLessonFilter(event.target.value); setLastExportId(""); }}><option value="all">All lessons</option>{lessons.filter((lesson) => lesson.contentProfile !== "placeholder" || lesson.bookId !== "custom").map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label><button className="secondary-button" onClick={refresh} disabled={!usingFirebase || loading}>重新整理</button></section>
        <section className="export-bar"><div><strong>匯出後再刪除</strong><span>本次篩選：{filtered.length} 筆</span></div><div className="export-actions"><select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}><option value="csv">CSV</option><option value="json">JSON</option></select><button className="secondary-button" onClick={exportResults} disabled={loading || !filtered.length}>匯出</button><button className="danger-text-button" onClick={deleteAfterExport} disabled={loading || !filtered.length || !lastExportId}>刪除已匯出資料</button></div></section>
        <section className="results-table-wrap"><table><thead><tr><th>Student ID</th><th>Lesson</th><th>Practice Score</th><th>Accuracy</th><th>Slot Reward</th><th>Type A</th><th>Type B</th><th>Time</th></tr></thead><tbody>{filtered.length ? filtered.map((result) => <tr key={result.id || result.sessionId}><td>{result.studentId}</td><td>{result.lessonTitle || result.lessonId}</td><td>{result.practiceScore} / {result.practiceMaxScore}</td><td>{result.accuracy}%</td><td>{result.slotScore}</td><td>{result.typeA?.firstAttemptCorrectCount} / {result.typeA?.totalQuestions}</td><td>{result.typeB?.firstAttemptCorrectCount} / {result.typeB?.totalQuestions}</td><td>{result.completedAt ? new Date(result.completedAt).toLocaleString("zh-TW") : "—"}</td></tr>) : <tr><td colSpan="8" className="empty-table">尚無符合條件的匿名作答結果。</td></tr>}</tbody></table></section>
      </> : null}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
