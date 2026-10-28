import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Ear,
  Eraser,
  Eye,
  GraduationCap,
  Home,
  Loader2,
  ListChecks,
  LockKeyhole,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";
import QuestionSetEditor from "./QuestionSetEditor.jsx";
import SlotMachine from "./SlotMachine.jsx";
import {
  FIXED_SETS,
  buildQuestions,
  describeSet,
  slotRoundPoints,
} from "./questionSets.js";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const SOUND_KEY = "letters-sound-on";
const readSoundSetting = () => {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};

const callFunction = async (name, data = {}) => {
  const result = await httpsCallable(functions, name)(data);
  return result.data;
};

const readableError = (error) => {
  const message = String(error?.message || "");
  const cleaned = message
    .replace(/^FirebaseError:\s*/i, "")
    .replace(/^functions\/[a-z-]+:\s*/i, "")
    .trim();
  if (cleaned && !/^internal$/i.test(cleaned)) return cleaned;
  return "系統暫時無法完成操作，請稍後再試。";
};

const formatDate = (dateKey) => {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(year, month - 1, day));
};

const formatTime = (milliseconds) =>
  milliseconds
    ? new Intl.DateTimeFormat("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(milliseconds))
    : "--:--";

function App() {
  const [view, setView] = useState("landing");
  const [student, setStudent] = useState({ id: "", name: "學生" });
  const [finalScore, setFinalScore] = useState(null);
  const [questionSet, setQuestionSet] = useState(null);
  const [soundOn, setSoundOn] = useState(readSoundSetting);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherPasswordInput, setTeacherPasswordInput] = useState("");
  const [teacherLoginError, setTeacherLoginError] = useState("");
  const [teacherLoginBusy, setTeacherLoginBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const goHome = () => {
    setView("landing");
    setStudent({ id: "", name: "學生" });
    setFinalScore(null);
  };

  const toggleSound = () => {
    setSoundOn((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // The setting still works for this visit.
      }
      return next;
    });
  };

  const startPractice = (studentId, set) => {
    const cleanId = studentId.trim();
    if (!cleanId) {
      window.alert("請先輸入學號！");
      return;
    }
    setQuestionSet(set);
    setStudent({ id: cleanId, name: "學生" });
    setFinalScore(null);
    setView("student");
  };

  const teacherLogin = async (event) => {
    event?.preventDefault();
    if (!teacherPasswordInput) return;
    setTeacherLoginBusy(true);
    setTeacherLoginError("");
    try {
      await callFunction("verifyTeacher", { password: teacherPasswordInput });
      setTeacherPassword(teacherPasswordInput);
      setTeacherPasswordInput("");
      setTeacherModalOpen(false);
      setView("teacher");
    } catch (error) {
      setTeacherLoginError(readableError(error));
    } finally {
      setTeacherLoginBusy(false);
    }
  };

  const teacherLogout = () => {
    setTeacherPassword("");
    setView("landing");
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      window.alert("網站連結已複製，可以貼給學生了！");
    } catch {
      window.prompt("請複製以下網址：", window.location.href);
    }
  };

  // Local development only: open /?slotdemo to try the slot machine directly.
  if (import.meta.env.DEV && window.location.search.includes("slotdemo")) {
    return (
      <SlotMachine
        roundNumber={1}
        totalRounds={5}
        correctCount={3}
        currentScore={0}
        final={false}
        saving={false}
        soundOn={soundOn}
        onComplete={(score) => window.alert(`本回得分 ${score}`)}
      />
    );
  }

  // Local development only: /?teacherdemo shows the set editor with fake data.
  if (import.meta.env.DEV && window.location.search.includes("teacherdemo")) {
    const store = (window.__demoSets ||= []);
    const fakeCall = async (name, data) => {
      if (name === "saveQuestionSet") {
        const set = { ...data.set, id: data.set.id || `demo-${store.length + 1}` };
        const index = store.findIndex((item) => item.id === set.id);
        if (index >= 0) store[index] = set;
        else store.push(set);
        return { set };
      }
      return { sets: [...store] };
    };
    return (
      <main className="page wide-page">
        <QuestionSetEditor
          password="demo"
          call={fakeCall}
          readableError={readableError}
          onAuthError={() => {}}
        />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => view !== "game" && goHome()}
          aria-label="回首頁"
        >
          <span className="brand-icon">
            <BookOpen size={25} />
          </span>
          <span>AI 英文字母聽寫</span>
        </button>
        <div className="topbar-actions">
          <button className="nav-button share-button" type="button" onClick={share}>
            <Share2 size={17} />
            <span>分享</span>
          </button>
          {view === "landing" && (
            <button
              className="nav-button teacher-button"
              type="button"
              onClick={() => {
                setTeacherLoginError("");
                setTeacherModalOpen(true);
              }}
            >
              <LockKeyhole size={17} />
              <span>教師後台</span>
            </button>
          )}
          {view === "teacher" && (
            <button className="nav-button" type="button" onClick={teacherLogout}>
              <LogOut size={17} />
              <span>教師登出</span>
            </button>
          )}
          {view === "student" && (
            <button className="nav-button" type="button" onClick={goHome}>
              <Home size={17} />
              <span>回首頁</span>
            </button>
          )}
        </div>
      </header>

      <main className={view === "teacher" ? "page wide-page" : "page"}>
        {view === "landing" && (
          <LandingPage
            onStart={startPractice}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />
        )}
        {view === "student" && questionSet && (
          <StudentPractice
            student={student}
            questionSet={questionSet}
            soundOn={soundOn}
            onComplete={(result) => {
              setFinalScore(result);
              setView("game");
            }}
          />
        )}
        {view === "game" && finalScore && (
          <RewardGame
            student={student}
            result={finalScore}
            onSaved={goHome}
          />
        )}
        {view === "teacher" && (
          <TeacherDashboard
            password={teacherPassword}
            onSessionExpired={teacherLogout}
          />
        )}
      </main>

      {teacherModalOpen && (
        <Modal onClose={() => setTeacherModalOpen(false)}>
          <form className="teacher-login" onSubmit={teacherLogin}>
            <div className="modal-heading">
              <span className="modal-icon violet">
                <Eye size={24} />
              </span>
              <div>
                <h2>教師後台</h2>
                <p>請輸入管理密碼</p>
              </div>
            </div>
            <label className="field-label" htmlFor="teacher-password">
              密碼
            </label>
            <input
              id="teacher-password"
              className="text-input"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={teacherPasswordInput}
              onChange={(event) => setTeacherPasswordInput(event.target.value)}
              autoFocus
            />
            {teacherLoginError && (
              <div className="inline-error">
                <AlertCircle size={18} />
                {teacherLoginError}
              </div>
            )}
            <button className="primary-button full-width" disabled={teacherLoginBusy}>
              {teacherLoginBusy ? <Loader2 className="spin" /> : <LockKeyhole />}
              登入教師後台
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function LandingPage({ onStart, soundOn, onToggleSound }) {
  const [studentId, setStudentId] = useState("");
  const [customSets, setCustomSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);

  useEffect(() => {
    let active = true;
    callFunction("getQuestionSets")
      .then((response) => active && setCustomSets(response.sets || []))
      .catch(() => active && setCustomSets([]))
      .finally(() => active && setLoadingSets(false));
    return () => {
      active = false;
    };
  }, []);

  const sets = [...FIXED_SETS, ...customSets];

  return (
    <section className="landing">
      <div className="hero">
        <span className="hero-doodle paint">🎨</span>
        <span className="hero-doodle letter">🅰️</span>
        <p className="eyebrow">
          <Sparkles size={17} /> 聽一聽・寫一寫・AI 幫你看
        </p>
        <h1>
          快樂學英文 <span>聽寫</span>
        </h1>
        <p className="hero-copy">輸入學號，再選一個題組開始挑戰！</p>
      </div>

      <div className="login-card">
        <div className="card-title">
          <span className="title-icon yellow">
            <GraduationCap size={31} />
          </span>
          <div>
            <h2>學生登入</h2>
            <p>今天也一起把字母寫漂亮！</p>
          </div>
        </div>
        <label className="field-label" htmlFor="student-id">
          學號
        </label>
        <input
          id="student-id"
          className="text-input"
          placeholder="例如：３０１００"
          inputMode="numeric"
          autoComplete="username"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        />
        <div className="set-picker-heading">
          <span>選擇題組</span>
          <button
            type="button"
            className={`sound-toggle ${soundOn ? "on" : ""}`}
            onClick={onToggleSound}
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            音效{soundOn ? "開" : "關"}
          </button>
        </div>
        <div className="set-grid">
          {sets.map((set) => (
            <button
              key={set.id}
              type="button"
              className={`set-button ${set.fixed ? "" : "custom"}`}
              onClick={() => onStart(studentId, set)}
            >
              <strong>{set.name}</strong>
              <small>{describeSet(set)}</small>
              <ArrowRight className="set-arrow" size={20} strokeWidth={3} />
            </button>
          ))}
          {loadingSets && (
            <p className="set-loading">
              <Loader2 className="spin" size={16} /> 載入老師的題組…
            </p>
          )}
        </div>
        <p className="privacy-note">
          練習紀錄會安全儲存在班級資料庫，供老師查看學習歷程。
        </p>
      </div>
    </section>
  );
}

function playSuccessSound(enabled = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startsAt = context.currentTime + index * 0.11;
      oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(0.22, startsAt + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startsAt);
      oscillator.stop(startsAt + 0.26);
    });
    window.setTimeout(() => context.close().catch(() => {}), 1100);
  } catch {
    // A visual celebration still appears if an older browser blocks Web Audio.
  }
}

function CelebrationBurst() {
  return (
    <div className="celebration-burst" aria-label="答對慶祝動畫">
      <div className="celebration-star">⭐</div>
      <strong>太棒了！</strong>
      <div className="confetti-cloud" aria-hidden="true">
        {Array.from({ length: 20 }, (_, index) => (
          <i key={index} style={{ "--confetti-index": index }} />
        ))}
      </div>
    </div>
  );
}

function StudentPractice({ student, questionSet, soundOn, onComplete }) {
  const [questions] = useState(() => buildQuestions(questionSet));
  const roundPoints = slotRoundPoints(questions.length, questionSet.slotEvery);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [checking, setChecking] = useState(false);
  const [audioState, setAudioState] = useState("loading");
  const [playing, setPlaying] = useState(false);
  const [writingUnlocked, setWritingUnlocked] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [slotOpportunity, setSlotOpportunity] = useState(null);
  const [slotScore, setSlotScore] = useState(0);
  const [savingFinal, setSavingFinal] = useState(false);
  const audioCache = useRef(new Map());
  const celebrationTimer = useRef(null);
  const targetLetter = questions[questionIndex];
  const completedCount = questionIndex + (feedback?.passed ? 1 : 0);

  const loadAudio = useCallback((letter) => {
    if (audioCache.current.has(letter)) {
      return audioCache.current.get(letter);
    }
    const source = `/audio/letters/${letter}${letter.toLowerCase()}.mp3`;
    const loading = new Promise((resolve, reject) => {
      const audio = new Audio(source);
      audio.preload = "auto";
      let settled = false;
      const ready = () => {
        if (settled) return;
        settled = true;
        resolve(source);
      };
      audio.oncanplaythrough = ready;
      audio.onloadeddata = ready;
      audio.onerror = () => {
        if (settled) return;
        settled = true;
        audioCache.current.delete(letter);
        reject(new Error("指定字母音檔載入失敗"));
      };
      audio.load();
    });
    audioCache.current.set(letter, loading);
    return loading;
  }, []);

  useEffect(() => {
    let active = true;
    setAudioState("loading");
    setWritingUnlocked(false);
    loadAudio(targetLetter)
      .then(() => active && setAudioState("ready"))
      .catch((error) => {
        console.error(error);
        if (active) setAudioState("error");
      });
    return () => {
      active = false;
    };
  }, [loadAudio, targetLetter]);

  useEffect(
    () => () => window.clearTimeout(celebrationTimer.current),
    [],
  );

  const playOnce = (audio) =>
    new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(new Error("字母音檔播放失敗"));
      audio.currentTime = 0;
      audio.play().catch(reject);
    });

  const playLetter = async () => {
    if (playing) return;
    setPlaying(true);
    setWritingUnlocked(false);
    try {
      const source = await loadAudio(targetLetter);
      const audio = new Audio(source);
      audio.preload = "auto";
      for (let count = 0; count < 3; count += 1) {
        await playOnce(audio);
        if (count < 2) await wait(1000);
      }
      setWritingUnlocked(true);
    } catch (error) {
      setAudioState("error");
      window.alert(readableError(error));
    } finally {
      setPlaying(false);
    }
  };

  const submitAttempt = async ({ strokes, thumbnailDataUrl }) => {
    setChecking(true);
    setFeedback(null);
    try {
      // v3: the server redraws each letter from the strokes, so the full
      // board image is no longer sent.
      const result = await callFunction("analyzeLetterAttemptV3", {
        studentId: student.id,
        studentName: student.name,
        targetLetter,
        strokes,
        thumbnailDataUrl,
        questionSetId: questionSet.id,
        questionSetName: questionSet.name,
        clientTimestamp: new Date().toISOString(),
      });
      setFeedback(result);
      if (result.passed) {
        playSuccessSound(soundOn);
        setCelebrating(true);
        window.clearTimeout(celebrationTimer.current);
        celebrationTimer.current = window.setTimeout(
          () => setCelebrating(false),
          1900,
        );
      }
    } catch (error) {
      setFeedback({
        passed: false,
        systemError: true,
        aiFeedback: readableError(error),
      });
    } finally {
      setChecking(false);
    }
  };

  const advanceQuestion = () => {
    setQuestionIndex((current) => current + 1);
    setFeedback(null);
  };

  const nextQuestion = () => {
    const answered = questionIndex + 1;
    const roundIndex = roundPoints.indexOf(answered);
    if (roundIndex >= 0) {
      setSlotOpportunity({
        roundNumber: roundIndex + 1,
        completed: answered,
        final: answered === questions.length,
      });
      return;
    }
    advanceQuestion();
  };

  const finishSlot = async (earned) => {
    const nextScore = slotScore + earned;
    if (slotOpportunity?.final) {
      setSavingFinal(true);
      try {
        const saved = await callFunction("finishGame", {
          studentId: student.id,
          studentName: student.name,
          addScore: nextScore,
        });
        setSlotScore(nextScore);
        setSlotOpportunity(null);
        onComplete({
          setScore: nextScore,
          todayScore: saved?.gameScore ?? nextScore,
          rounds: roundPoints.length,
          letters: questions.length,
          setName: questionSet.name,
        });
      } catch (error) {
        window.alert(readableError(error));
      } finally {
        setSavingFinal(false);
      }
      return;
    }
    setSlotScore(nextScore);
    setSlotOpportunity(null);
    advanceQuestion();
  };

  // Rounds already played: round points before the current question.
  const roundsDone = roundPoints.filter((point) => point <= questionIndex).length;

  const nextActionLabel = (() => {
    const answered = questionIndex + 1;
    if (answered === questions.length) return "最後一回拉霸";
    if (roundPoints.includes(answered)) return "去拉霸";
    return "下一題";
  })();

  return (
    <>
      <section className="practice-card">
        <p className="practice-set-name">
          {questionSet.name}・{describeSet(questionSet)}
        </p>
        <div className="student-progress">
          <div className="student-identity">
            <span className="round-icon yellow-soft">
              <UserRound size={20} />
            </span>
            <div>
              <span>學號</span>
              <strong>{student.id}</strong>
            </div>
          </div>
          <div className="progress-count">
            <span>目前進度</span>
            <strong>
              {questionIndex + 1} / {questions.length}
            </strong>
          </div>
          <div className="slot-progress">
            <span>答對／拉霸／總分</span>
            <strong>
              {completedCount}／{roundsDone}／{slotScore}
            </strong>
          </div>
        </div>

        <button
          className="audio-button"
          type="button"
          onClick={playLetter}
          disabled={playing || audioState === "loading"}
        >
          {playing ? (
            <RefreshCw className="spin" size={27} />
          ) : audioState === "loading" ? (
            <Loader2 className="spin" size={27} />
          ) : (
            <Ear size={28} />
          )}
          <span>
            {playing
              ? "正在播放 3 次，請仔細聽…"
              : audioState === "loading"
                ? "指定字母音檔準備中…"
                : writingUnlocked
                  ? "再聽一次（完整播放 3 次）"
                  : "先聽目標字母 3 次"}
            <small>指定音檔・每次完整播放・中間停頓 1 秒</small>
          </span>
        </button>
        {audioState === "error" && (
          <button className="retry-audio" type="button" onClick={playLetter}>
            音檔載入失敗，點此重試
          </button>
        )}

        <DrawingCanvas
          key={targetLetter}
          disabled={checking || feedback?.passed || !writingUnlocked || playing}
          writingLocked={!writingUnlocked || playing}
          onSubmit={submitAttempt}
        />

        <div className="feedback-area" aria-live="polite">
          {checking && (
            <div className="checking-state">
              <BrainCircuit className="pulse" size={30} />
              <div>
                <strong>AI 正在辨識字母…</strong>
                <span>同時檢查大小寫與四線格位置，字不用寫得很工整</span>
              </div>
            </div>
          )}
          {!checking && feedback?.passed && (
            <div className="feedback success">
              <CheckCircle2 size={38} />
              <div className="feedback-copy">
                <strong>答對了！</strong>
                <span>{feedback.aiFeedback}</span>
                <div className="score-row">
                  <em>大寫 {feedback.uppercaseScore}</em>
                  <em>小寫 {feedback.lowercaseScore}</em>
                  <em>位置 {feedback.positionScore}</em>
                </div>
              </div>
              <button className="next-button" type="button" onClick={nextQuestion}>
                {nextActionLabel}
                <ArrowRight size={20} />
              </button>
            </div>
          )}
          {!checking && feedback && !feedback.passed && (
            <div className="feedback error">
              <AlertCircle size={38} />
              <div className="feedback-copy">
                <strong>{feedback.systemError ? "系統暫時忙碌" : "答案不相同，再試一次！"}</strong>
                <span>{feedback.aiFeedback}</span>
                {!feedback.systemError && (
                  <div className="score-row">
                    <em>左側字形 {feedback.uppercaseScore}</em>
                    <em>右側字形 {feedback.lowercaseScore}</em>
                    <em>位置 {feedback.positionScore}</em>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      {celebrating && <CelebrationBurst />}
      {slotOpportunity && (
        <SlotMachine
          key={slotOpportunity.roundNumber}
          roundNumber={slotOpportunity.roundNumber}
          totalRounds={roundPoints.length}
          correctCount={slotOpportunity.completed}
          currentScore={slotScore}
          final={slotOpportunity.final}
          saving={savingFinal}
          soundOn={soundOn}
          onComplete={finishSlot}
        />
      )}
    </>
  );
}

function drawGuide(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const horizontal = [
    { y: 0.08, color: "#cbd5e1", dash: [] },
    { y: 0.37, color: "#cbd5e1", dash: [3, 7] },
    { y: 0.68, color: "#8be0ef", dash: [] },
    { y: 0.94, color: "#cbd5e1", dash: [] },
  ];
  ctx.lineWidth = Math.max(2, width / 260);
  for (const line of horizontal) {
    ctx.beginPath();
    ctx.setLineDash(line.dash);
    ctx.strokeStyle = line.color;
    ctx.moveTo(width * 0.025, height * line.y);
    ctx.lineTo(width * 0.975, height * line.y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.setLineDash([4, 7]);
  ctx.lineWidth = Math.max(1, width / 500);
  ctx.strokeStyle = "#fde68a";
  ctx.moveTo(width * 0.5, height * 0.04);
  ctx.lineTo(width * 0.5, height * 0.97);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawStrokeCollection(ctx, width, height, strokes, color = "#2563eb") {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(12, width * 0.035);
  for (const stroke of strokes) {
    const points = stroke.points || [];
    if (!points.length) continue;
    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);
    if (points.length === 1) {
      ctx.lineTo(points[0].x * width + 0.01, points[0].y * height + 0.01);
    } else {
      for (const point of points.slice(1)) {
        ctx.lineTo(point.x * width, point.y * height);
      }
    }
    ctx.stroke();
  }
}

function DrawingCanvas({ disabled, writingLocked, onSubmit }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const startTimeRef = useRef(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.round(rect.width * ratio));
    const height = Math.max(240, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    drawGuide(ctx, width, height);
    drawStrokeCollection(ctx, width, height, strokesRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [render]);

  const pointFromEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (startTimeRef.current === null) startTimeRef.current = performance.now();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      t: Math.round(performance.now() - startTimeRef.current),
    };
  };

  const pointerDown = (event) => {
    if (disabled || submitting) return;
    event.preventDefault();
    canvasRef.current.setPointerCapture?.(event.pointerId);
    const point = pointFromEvent(event);
    activeStrokeRef.current = { points: [point] };
    strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    setStrokeCount(strokesRef.current.length);
    render();
  };

  const pointerMove = (event) => {
    if (!activeStrokeRef.current || disabled || submitting) return;
    event.preventDefault();
    activeStrokeRef.current.points.push(pointFromEvent(event));
    render();
  };

  const pointerUp = (event) => {
    if (!activeStrokeRef.current) return;
    event.preventDefault();
    canvasRef.current.releasePointerCapture?.(event.pointerId);
    activeStrokeRef.current = null;
  };

  const clear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    startTimeRef.current = null;
    setStrokeCount(0);
    render();
  };

  const createThumbnail = () => {
    const source = canvasRef.current;
    const thumbnail = document.createElement("canvas");
    thumbnail.width = 480;
    thumbnail.height = 360;
    const context = thumbnail.getContext("2d");
    context.drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
    return thumbnail.toDataURL("image/jpeg", 0.76);
  };

  const submit = async () => {
    if (!strokesRef.current.length) {
      window.alert("請先在格線上寫出大寫和小寫字母！");
      return;
    }
    setSubmitting(true);
    try {
      const strokes = structuredClone(strokesRef.current);
      await onSubmit({
        strokes,
        thumbnailDataUrl: createThumbnail(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="canvas-section">
      <div className="canvas-instructions">
        <span>左邊寫大寫</span>
        <i />
        <span>右邊寫小寫</span>
      </div>
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          aria-label="英文字母聽寫板：左邊寫大寫，右邊寫小寫"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        />
        {writingLocked && (
          <div className="canvas-lock" aria-live="polite">
            <Ear size={30} />
            <strong>請先完整聽完 3 次</strong>
            <span>播放結束後才會開放手寫板</span>
          </div>
        )}
      </div>
      <div className="canvas-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={clear}
          disabled={disabled || submitting}
        >
          <Eraser size={20} /> 橡皮擦
        </button>
        <button
          className="submit-button"
          type="button"
          onClick={submit}
          disabled={disabled || submitting}
        >
          {submitting ? <Loader2 className="spin" /> : <Send size={20} />}
          交卷檢查
        </button>
      </div>
      <p className="stroke-counter">已記錄 {strokeCount} 筆；支援滑鼠、觸控筆與手指。</p>
    </div>
  );
}

function RewardGame({ student, result, onSaved }) {
  return (
    <section className="reward-page completion-summary">
      <div className="reward-heading">
        <Trophy size={38} />
        <div>
          <p>「{result.setName}」{result.letters} 個字母全部完成！</p>
          <h1>學號 {student.id}，做得太棒了！</h1>
        </div>
      </div>
      <div className="completion-score-card">
        <span className="completion-crown">👑</span>
        <div>
          <small>這個題組 {result.rounds} 回拉霸得分</small>
          <strong>{result.setScore}</strong>
        </div>
        <div className="completion-stats">
          <div>
            <small>完成字母</small>
            <strong>{result.letters}</strong>
          </div>
          <div>
            <small>今天累計</small>
            <strong>{result.todayScore}</strong>
          </div>
        </div>
      </div>
      <button className="save-game-button" type="button" onClick={onSaved}>
        <Home />
        回首頁選下一個題組
      </button>
    </section>
  );
}

function TeacherDashboard({ password, onSessionExpired }) {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [tab, setTab] = useState("records");
  const [setFilter, setSetFilter] = useState("");
  const longPressTimer = useRef(null);

  const handleAuthError = useCallback(
    (caught) => {
      const message = readableError(caught);
      setError(message);
      if (/密碼|permission-denied/i.test(message)) onSessionExpired();
    },
    [onSessionExpired],
  );

  const loadDates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await callFunction("getTeacherDates", { password });
      setDates(response.dates || []);
    } catch (caught) {
      handleAuthError(caught);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, password]);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  const chooseDate = async (dateKey) => {
    setSelectedDate(dateKey);
    setSelectedStudent(null);
    setDetail(null);
    setSelectedAttempt(null);
    setPanelLoading(true);
    setError("");
    try {
      const response = await callFunction("getTeacherStudents", {
        password,
        dateKey,
      });
      setStudents(response.students || []);
    } catch (caught) {
      handleAuthError(caught);
    } finally {
      setPanelLoading(false);
    }
  };

  const chooseStudent = async (studentItem) => {
    setSelectedStudent(studentItem);
    setSetFilter("");
    setDetail(null);
    setSelectedAttempt(null);
    setPanelLoading(true);
    setError("");
    try {
      const response = await callFunction("getTeacherStudentDetail", {
        password,
        sessionKey: studentItem.sessionKey,
      });
      setDetail(response);
      if (response.attempts?.length) {
        setSelectedAttempt(response.attempts[response.attempts.length - 1]);
      }
    } catch (caught) {
      handleAuthError(caught);
    } finally {
      setPanelLoading(false);
    }
  };

  const deleteData = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await callFunction("deleteStudentDateData", {
        password,
        sessionKey: deleteTarget.sessionKey,
      });
      const remaining = students.filter(
        (studentItem) => studentItem.sessionKey !== deleteTarget.sessionKey,
      );
      setStudents(remaining);
      if (selectedStudent?.sessionKey === deleteTarget.sessionKey) {
        setSelectedStudent(null);
        setDetail(null);
        setSelectedAttempt(null);
      }
      setDeleteTarget(null);
      await loadDates();
    } catch (caught) {
      handleAuthError(caught);
    } finally {
      setDeleting(false);
    }
  };

  const overrideAttempt = async (attempt, approve) => {
    setOverriding(true);
    setError("");
    try {
      const response = await callFunction("setTeacherOverride", {
        password,
        attemptId: attempt.id,
        approve,
      });
      if (!response.changed) return;
      const delta = approve ? 1 : -1;
      const updated = {
        ...attempt,
        passed: response.passed,
        teacherOverride: response.teacherOverride,
        originalPassed: false,
      };
      setSelectedAttempt(updated);
      setDetail((current) =>
        current
          ? {
              ...current,
              session: {
                ...current.session,
                completedCount: current.session.completedCount + delta,
              },
              attempts: current.attempts.map((item) =>
                item.id === attempt.id ? updated : item,
              ),
            }
          : current,
      );
      setStudents((current) =>
        current.map((item) =>
          item.sessionKey === selectedStudent?.sessionKey
            ? { ...item, completedCount: item.completedCount + delta }
            : item,
        ),
      );
    } catch (caught) {
      handleAuthError(caught);
    } finally {
      setOverriding(false);
    }
  };

  const setNames = [
    ...new Set((detail?.attempts || []).map((attempt) => attempt.questionSetName || "舊版（全部字母）")),
  ];
  const visibleAttempts = (detail?.attempts || []).filter(
    (attempt) => !setFilter || (attempt.questionSetName || "舊版（全部字母）") === setFilter,
  );

  const startLongPress = (studentItem) => {
    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setDeleteTarget(studentItem);
    }, 650);
  };

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimer.current);
  };

  return (
    <section className="teacher-dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">
            <Eye size={17} /> 教師專用
          </p>
          <h1>字母學習歷程</h1>
          <p>依日期 → 學生 → 練習過程查看；資料以臺北時區整理。</p>
        </div>
        <div className="dashboard-tabs">
          <button
            type="button"
            className={tab === "records" ? "active" : ""}
            onClick={() => setTab("records")}
          >
            <CalendarDays size={18} /> 學習歷程
          </button>
          <button
            type="button"
            className={tab === "sets" ? "active" : ""}
            onClick={() => setTab("sets")}
          >
            <ListChecks size={18} /> 出題設定
          </button>
          {tab === "records" && (
            <button className="refresh-button" type="button" onClick={loadDates}>
              <RefreshCw size={18} /> 重新整理
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {tab === "sets" ? (
        <QuestionSetEditor
          password={password}
          call={callFunction}
          readableError={readableError}
          onAuthError={handleAuthError}
        />
      ) : (
      <div className="dashboard-grid">
        <aside className="dashboard-column dates-column">
          <div className="column-title">
            <CalendarDays size={21} />
            <div>
              <strong>練習日期</strong>
              <span>選擇一天</span>
            </div>
          </div>
          {loading ? (
            <LoadingRows />
          ) : dates.length ? (
            <div className="item-list">
              {dates.map((date) => (
                <button
                  key={date.dateKey}
                  className={`date-item ${selectedDate === date.dateKey ? "selected" : ""}`}
                  type="button"
                  onClick={() => chooseDate(date.dateKey)}
                >
                  <CalendarDays size={19} />
                  <span>
                    <strong>{date.dateKey.replaceAll("-", "/")}</strong>
                    <small>
                      {date.studentCount} 位學生・完成 {date.completedCount} 題
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CalendarDays />} text="目前沒有練習日期" />
          )}
        </aside>

        <aside className="dashboard-column students-column">
          <div className="column-title">
            <Users size={21} />
            <div>
              <strong>學生名單</strong>
              <span>{selectedDate ? formatDate(selectedDate) : "請先選日期"}</span>
            </div>
          </div>
          {panelLoading && !selectedStudent ? (
            <LoadingRows />
          ) : !selectedDate ? (
            <EmptyState icon={<CalendarDays />} text="先從左側選擇日期" />
          ) : students.length ? (
            <>
              <p className="context-hint">
                電腦按右鍵、平板長按學生，可刪除該日資料。
              </p>
              <div className="item-list">
                {students.map((studentItem) => (
                  <div
                    key={studentItem.sessionKey}
                    className={`student-item ${
                      selectedStudent?.sessionKey === studentItem.sessionKey
                        ? "selected"
                        : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => chooseStudent(studentItem)}
                    onKeyDown={(event) =>
                      event.key === "Enter" && chooseStudent(studentItem)
                    }
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setDeleteTarget(studentItem);
                    }}
                    onPointerDown={() => startLongPress(studentItem)}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onPointerMove={cancelLongPress}
                  >
                    <span className="student-avatar">
                      <UserRound size={21} />
                    </span>
                    <span className="student-copy">
                      <strong>{studentItem.studentId}</strong>
                      <small>{studentItem.studentName || "未填姓名"}</small>
                    </span>
                    <span className="student-stats">
                      <em>{studentItem.completedCount} 題</em>
                      <small>🏆 {studentItem.gameScore}</small>
                    </span>
                    <button
                      className="student-delete"
                      type="button"
                      title="刪除該學生當日資料"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(studentItem);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={<Users />} text="這天沒有學生資料" />
          )}
        </aside>

        <div className="dashboard-column detail-column">
          {!selectedStudent ? (
            <EmptyState icon={<UserRound />} text="選擇一位學生查看學習歷程" large />
          ) : panelLoading && !detail ? (
            <div className="detail-loading">
              <Loader2 className="spin" size={36} />
              載入學生練習紀錄…
            </div>
          ) : detail ? (
            <>
              <div className="student-detail-header">
                <div>
                  <span>{detail.session.dateKey.replaceAll("-", "/")}</span>
                  <h2>
                    {detail.session.studentId}
                    <small>{detail.session.studentName}</small>
                  </h2>
                </div>
                <div className="summary-cards">
                  <span>
                    <CheckCircle2 />
                    <small>完成題數</small>
                    <strong>{detail.session.completedCount}</strong>
                  </span>
                  <span>
                    <Trophy />
                    <small>遊戲總分</small>
                    <strong>{detail.session.gameScore}</strong>
                  </span>
                  <span>
                    <BrainCircuit />
                    <small>全部嘗試</small>
                    <strong>{detail.session.totalAttempts}</strong>
                  </span>
                </div>
              </div>

              {selectedAttempt && (
                <ReplayPanel
                  attempt={selectedAttempt}
                  onOverride={overrideAttempt}
                  overriding={overriding}
                />
              )}

              <div className="history-heading">
                <div>
                  <h3>學習歷程卡片</h3>
                  <p>成功與需要再練習的每次交卷都會保留。</p>
                </div>
                <div className="history-tools">
                  {setNames.length > 1 && (
                    <select
                      aria-label="依題組篩選"
                      value={setFilter}
                      onChange={(event) => setSetFilter(event.target.value)}
                    >
                      <option value="">全部題組</option>
                      {setNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <span>{visibleAttempts.length} 筆紀錄</span>
                </div>
              </div>
              {visibleAttempts.length ? (
                <div className="attempt-grid">
                  {visibleAttempts.map((attempt) => (
                    <button
                      key={attempt.id}
                      className={`attempt-card ${
                        selectedAttempt?.id === attempt.id ? "selected" : ""
                      }`}
                      type="button"
                      onClick={() => setSelectedAttempt(attempt)}
                    >
                      <img
                        src={attempt.thumbnail}
                        alt={`${attempt.letter} 的手寫截圖`}
                      />
                      <strong>{attempt.letter}</strong>
                      <em className="attempt-set">{attempt.questionSetName || "舊版（全部字母）"}</em>
                      <span className={attempt.passed ? "pass" : "retry"}>
                        {attempt.teacherOverride
                          ? "老師改判通過"
                          : attempt.passed
                            ? "通過"
                            : "再練習"}
                      </span>
                      <small>
                        <Clock3 size={13} /> {formatTime(attempt.timestampMillis)}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<BrainCircuit />} text="這位學生尚無交卷紀錄" />
              )}
            </>
          ) : null}
        </div>
      </div>
      )}

      {deleteTarget && (
        <Modal onClose={() => !deleting && setDeleteTarget(null)}>
          <div className="delete-confirmation">
            <span className="modal-icon red">
              <Trash2 size={26} />
            </span>
            <h2>是否刪除此資料？</h2>
            <p>
              將刪除 <strong>{deleteTarget.studentId}</strong>
              {deleteTarget.studentName && `（${deleteTarget.studentName}）`}
              在 <strong>{selectedDate.replaceAll("-", "/")}</strong> 的所有練習紀錄、
              截圖、筆跡與遊戲總分。此動作無法復原。
            </p>
            <div className="confirmation-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                否，回原畫面
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={deleteData}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="spin" /> : <Trash2 />}
                是，直接刪除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

const ZONE_NAMES = {
  tall: "頂線→基線",
  dotted: "中線上方→基線",
  small: "中線→基線",
  descender: "中線→底線",
  dottedDescender: "中線上方→底線",
};

function V3SideSummary({ label, side }) {
  if (!side?.geometry) return null;
  const { geometry, identity } = side;
  return (
    <div className="v3-side">
      <strong>{label}</strong>
      <span className={identity?.ok ? "pass" : "retry"}>
        字形：{identity?.ok ? `認得出（${identity.seen}）` : `不符（看起來像 ${identity?.seen || "?"}）`}
      </span>
      <span className={geometry.ok ? "pass" : "retry"}>
        格線：{geometry.ok ? "位置正確" : "位置不對"}（應 {ZONE_NAMES[geometry.zone] || "—"}）
      </span>
      {side.shape?.angles?.length > 0 && (
        <span className={side.shape.ok ? "pass" : "retry"}>
          直線：{side.shape.ok ? "夠直" : "太斜"}（傾斜 {side.shape.angles.join("°、")}°）
        </span>
      )}
    </div>
  );
}

function ReplayPanel({ attempt, onOverride, overriding }) {
  const v3Detail =
    attempt.aiRawResult?.method === "geometry-plus-ai-v3"
      ? attempt.aiRawResult.detail
      : null;
  const canOverride = attempt.originalPassed === false || !attempt.passed;
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [playKey, setPlayKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const strokes = attempt.strokes || [];
    const duration = Math.max(
      1,
      ...strokes.flatMap((stroke) => (stroke.points || []).map((point) => point.t || 0)),
    );
    let startedAt = null;
    let stopped = false;

    const drawFrame = (elapsed) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(320, Math.round(rect.width * ratio));
      const height = Math.max(240, Math.round(rect.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      drawGuide(context, width, height);
      const visible = strokes
        .map((stroke) => ({
          points: (stroke.points || []).filter((point) => point.t <= elapsed),
        }))
        .filter((stroke) => stroke.points.length);
      drawStrokeCollection(context, width, height, visible, "#22d3ee");
    };

    const animate = (timestamp) => {
      if (stopped) return;
      if (startedAt === null) startedAt = timestamp;
      const elapsed = Math.min(duration, (timestamp - startedAt) * speed);
      drawFrame(elapsed);
      setProgress(Math.round((elapsed / duration) * 100));
      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      stopped = true;
      cancelAnimationFrame(animationRef.current);
    };
  }, [attempt, playKey, speed]);

  return (
    <div className="replay-panel">
      <div className="replay-title">
        <div>
          <span className="live-dot" />
          <strong>筆跡還原播放器</strong>
          <small>
            {attempt.letter}・{formatTime(attempt.timestampMillis)}
          </small>
        </div>
        <div className="replay-controls">
          <select
            aria-label="重播速度"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1× 等速</option>
            <option value={2}>2×</option>
          </select>
          <button type="button" onClick={() => setPlayKey((current) => current + 1)}>
            <RotateCcw size={17} /> 重播
          </button>
        </div>
      </div>
      <div className="replay-canvas-wrap">
        <canvas ref={canvasRef} />
        <span className="replay-badge">
          <Play size={14} /> {progress}%
        </span>
      </div>
      <div className="replay-progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="ai-result-grid">
        <div>
          <span>
            <Volume2 size={16} /> AI 原始判讀
          </span>
          <strong>{attempt.aiRecognition || "未回傳"}</strong>
          <small>{attempt.aiModel}</small>
        </div>
        <div>
          <span>
            <BrainCircuit size={16} /> 位置吻合度
          </span>
          <strong>{attempt.positionScore} 分</strong>
          <small>大寫 {attempt.uppercaseScore}・小寫 {attempt.lowercaseScore}</small>
        </div>
        <div className="ai-feedback-cell">
          <span>AI 回饋</span>
          <strong>{attempt.aiFeedback}</strong>
          <small>信心分數 {attempt.confidence}</small>
        </div>
      </div>
      {v3Detail && (
        <div className="v3-summary">
          <V3SideSummary label="左邊（大寫）" side={v3Detail.left} />
          <V3SideSummary label="右邊（小寫）" side={v3Detail.right} />
          {attempt.aiRawResult?.comment && (
            <p className="v3-comment">AI 字形說明：{attempt.aiRawResult.comment}</p>
          )}
        </div>
      )}
      {canOverride && (
        <div className="override-row">
          {attempt.teacherOverride ? (
            <>
              <span className="pass">已由老師改判為正確</span>
              <button
                className="secondary-button"
                type="button"
                disabled={overriding}
                onClick={() => onOverride(attempt, false)}
              >
                {overriding ? <Loader2 className="spin" size={18} /> : <RotateCcw size={18} />}
                取消改判
              </button>
            </>
          ) : (
            <button
              className="submit-button"
              type="button"
              disabled={overriding}
              onClick={() => onOverride(attempt, true)}
            >
              {overriding ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              老師改判為正確
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-rows">
      <span />
      <span />
      <span />
    </div>
  );
}

function EmptyState({ icon, text, large = false }) {
  return (
    <div className={`empty-state ${large ? "large" : ""}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose} aria-label="關閉">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default App;
