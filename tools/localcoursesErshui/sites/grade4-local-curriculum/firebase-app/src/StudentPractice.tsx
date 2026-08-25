import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  appendTicketEvent,
  createTicketAttempt,
  updateTicketAttempt,
  uploadAttemptPdf,
  uploadAttemptRecording,
  type TicketAttemptRecord,
} from "./firebase";
import {
  DESTINATIONS,
  SCHEDULE_SOURCE,
  destinationById,
  durationMinutes,
  filterTrains,
  minutesOf,
  nearestWeekendDates,
  timeOptions,
  trainById,
  type DestinationId,
} from "./schedule";
import {
  buildEvidencePdf,
  captureEvidence,
  type EvidenceCapture,
} from "./evidence";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type PracticeState = {
  studentId: string;
  travelDate: string;
  timeStart: string;
  timeEnd: string;
  destination: DestinationId | null;
  trainId: string | null;
  summaryChecks: string[];
};

const STEP_TITLES = [
  "輸入學號",
  "選日期與搭車時段",
  "選起訖站",
  "選正式車次",
  "核對行程摘要",
  "確認練習車票",
  "完成任務",
];

const SUMMARY_FIELDS = [
  ["from", "From／出發站"],
  ["to", "To／抵達站"],
  ["date", "Date／日期"],
  ["train", "Train／車次"],
  ["depart", "Depart／出發"],
  ["arrive", "Arrive／抵達"],
] as const;

const initialState: PracticeState = {
  studentId: "",
  travelDate: "",
  timeStart: "09:00",
  timeEnd: "12:00",
  destination: null,
  trainId: null,
  summaryChecks: [],
};

function playCorrect(complete = false) {
  const AudioContextType =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextType) return;
  const audio = new AudioContextType();
  const notes = complete ? [523, 659, 784, 1046] : [659, 784];
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audio.currentTime + index * 0.11 + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + index * 0.11 + 0.22,
    );
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + index * 0.11);
    oscillator.stop(audio.currentTime + index * 0.11 + 0.24);
  });
  window.setTimeout(() => void audio.close(), 1100);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function StudentPractice({ onHome }: { onHome: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<PracticeState>(initialState);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<TicketAttemptRecord | null>(null);
  const [captures, setCaptures] = useState<EvidenceCapture[]>([]);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "error" | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [pdfSynced, setPdfSynced] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("尚未開始");
  const [recordingWanted, setRecordingWanted] = useState(true);
  const [recordingStatus, setRecordingStatus] =
    useState<TicketAttemptRecord["recordingStatus"]>("not_requested");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingBytes = useRef(0);
  const eventSeq = useRef(1);
  const startedAt = useRef(Date.now());
  const evidenceRef = useRef<HTMLDivElement>(null);
  const weekends = useMemo(() => nearestWeekendDates(), []);
  const times = useMemo(() => timeOptions(), []);
  const filteredTrains = useMemo(
    () => filterTrains(state.timeStart, state.timeEnd),
    [state.timeEnd, state.timeStart],
  );
  const selectedDestination = destinationById(state.destination);
  const selectedTrain = trainById(state.trainId);
  const recordingSupported =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== "undefined";
  const qaMode =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  function snapshot(override: Partial<PracticeState> = {}) {
    return { ...state, step, ...override };
  }

  async function writeEvent(
    action: string,
    payload: Record<string, unknown>,
    before = snapshot(),
    after = snapshot(),
  ) {
    if (!attemptId) return;
    const event = {
      seq: eventSeq.current,
      step,
      action,
      payload,
      before,
      after,
      clientElapsedMs: Date.now() - startedAt.current,
      createdAtClient: new Date().toISOString(),
    };
    eventSeq.current += 1;
    void appendTicketEvent(attemptId, event).catch(() =>
      setCloudStatus("等待網路同步"),
    );
    const nextEventCount = event.seq;
    setAttempt((current) =>
      current ? { ...current, eventCount: nextEventCount } : current,
    );
    void updateTicketAttempt(attemptId, {
      eventCount: nextEventCount,
    }).catch(() => undefined);
  }

  async function captureStep(page: Step, title: string) {
    if (!evidenceRef.current) return captures;
    const capture = await captureEvidence(evidenceRef.current, page, title);
    const next = [
      ...captures.filter((item) => item.page !== capture.page),
      capture,
    ].sort((a, b) => a.page - b.page);
    setCaptures(next);
    return next;
  }

  function requestOptionalRecording() {
    if (!recordingWanted) {
      return Promise.resolve({
        status: "declined" as const,
        stream: null,
      });
    }
    if (!recordingSupported) {
      return Promise.resolve({
        status: "unsupported" as const,
        stream: null,
      });
    }
    const displayOptions = {
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 8, max: 12 },
        displaySurface: "browser",
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
    } as DisplayMediaStreamOptions;
    return navigator.mediaDevices
      .getDisplayMedia(displayOptions)
      .then((stream) => ({
        status: "not_requested" as const,
        stream,
      }))
      .catch(() => ({
        status: "declined" as const,
        stream: null,
      }));
  }

  function startOptionalRecording(
    stream: MediaStream,
    currentUid: string,
    currentAttemptId: string,
  ) {
    try {
      const mimeType = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4;codecs=avc1",
        "video/mp4",
      ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 850_000,
      });
      recordingChunks.current = [];
      recordingBytes.current = 0;
      recorder.ondataavailable = (event) => {
        if (event.data.size <= 0) return;
        if (recordingBytes.current + event.data.size > 78 * 1024 * 1024) {
          if (recorder.state !== "inactive") recorder.stop();
          stream.getTracks().forEach((track) => track.stop());
          setCloudStatus("錄影已達80 MB上限，正在上傳");
          return;
        }
        recordingChunks.current.push(event.data);
        recordingBytes.current += event.data.size;
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordingChunks.current, {
          type: recorder.mimeType || mimeType || "video/webm",
        });
        if (blob.size === 0) return;
        void uploadAttemptRecording(currentUid, currentAttemptId, blob)
          .then((recordingPath) =>
            updateTicketAttempt(currentAttemptId, {
              recordingPath,
              recordingStatus: "recorded",
            }),
          )
          .then(() => setRecordingStatus("recorded"))
          .catch(() => setCloudStatus("錄影等待上傳"));
      };
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
      });
      recorder.start(1000);
      setMediaRecorder(recorder);
      setRecordingStatus("not_requested");
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setRecordingStatus("declined");
      void updateTicketAttempt(currentAttemptId, {
        recordingStatus: "declined",
      });
    }
  }

  async function fail(text: string, code: string) {
    setFeedback("error");
    setMessage(text);
    const nextErrors = (attempt?.errorCount ?? 0) + 1;
    setAttempt((current) =>
      current ? { ...current, errorCount: nextErrors } : current,
    );
    if (attemptId) {
      void updateTicketAttempt(attemptId, { errorCount: nextErrors });
      await writeEvent("validation_failed", { code, message: text });
    }
  }

  async function pass(title: string, nextStep?: Step) {
    setFeedback("correct");
    setMessage("You’re right! 答對了！");
    if (!muted) playCorrect(step === 7);
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    const nextCaptures = await captureStep(step, title);
    if (attemptId) {
      const passedSteps = Math.max(attempt?.passedSteps ?? 0, step);
      const score = Math.round((passedSteps / 7) * 100);
      setAttempt((current) =>
        current ? { ...current, passedSteps, score } : current,
      );
      void updateTicketAttempt(attemptId, {
        currentStep: nextStep ?? step,
        passedSteps,
        score,
      });
      await writeEvent(
        "step_passed",
        { page: step, title },
        snapshot(),
        { ...snapshot(), step: nextStep ?? step },
      );
    }
    if (nextStep) {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setStep(nextStep);
      setFeedback(null);
      setMessage("");
    }
    return nextCaptures;
  }

  async function startPractice() {
    if (!/^\d{5}$/.test(state.studentId)) {
      await fail("請輸入五位數學號，例如40100。", "invalid_student_id");
      return;
    }
    setBusy(true);
    setCloudStatus("正在建立安全紀錄…");
    if (qaMode) {
      setCloudStatus("本機QA模式（不寫入Firebase）");
      setFeedback("correct");
      setMessage("You’re right! 答對了！");
      if (!muted) playCorrect();
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      if (evidenceRef.current) {
        const firstCapture = await captureEvidence(
          evidenceRef.current,
          1,
          "輸入學號",
        );
        setCaptures([firstCapture]);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      setStep(2);
      setFeedback(null);
      setMessage("");
      setBusy(false);
      return;
    }
    try {
      const initialRecordingStatus: TicketAttemptRecord["recordingStatus"] =
        !recordingWanted
          ? "declined"
          : recordingSupported
            ? "not_requested"
            : "unsupported";
      // Both requests begin inside the Start button's user gesture. This keeps
      // screen-share permission eligible while the server records trusted time.
      const recordingRequest = requestOptionalRecording();
      const attemptRequest = createTicketAttempt(
        state.studentId,
        initialRecordingStatus,
      );
      const [recordingResult, result] = await Promise.all([
        recordingRequest,
        attemptRequest,
      ]);
      setAttemptId(result.attemptId);
      setUid(result.user.uid);
      const createdRecord = {
        ...result.record,
        recordingStatus: recordingResult.status,
      };
      setAttempt(createdRecord);
      setRecordingStatus(recordingResult.status);
      if (recordingResult.status !== initialRecordingStatus) {
        void updateTicketAttempt(result.attemptId, {
          recordingStatus: recordingResult.status,
        });
      }
      if (recordingResult.stream) {
        startOptionalRecording(
          recordingResult.stream,
          result.user.uid,
          result.attemptId,
        );
      }
      startedAt.current = Date.now();
      eventSeq.current = 2;
      await appendTicketEvent(result.attemptId, {
        seq: 1,
        step: 1,
        action: "attempt_started",
        payload: { studentId: state.studentId },
        before: {},
        after: snapshot(),
        clientElapsedMs: 0,
        createdAtClient: new Date().toISOString(),
      });
      setFeedback("correct");
      setMessage("You’re right! 答對了！");
      if (!muted) playCorrect();
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      const firstCapture = evidenceRef.current
        ? await captureEvidence(evidenceRef.current, 1, "輸入學號")
        : null;
      if (firstCapture) setCaptures([firstCapture]);
      await appendTicketEvent(result.attemptId, {
        seq: 2,
        step: 1,
        action: "step_passed",
        payload: { page: 1, title: "輸入學號" },
        before: snapshot(),
        after: { ...snapshot(), step: 2 },
        clientElapsedMs: Date.now() - startedAt.current,
        createdAtClient: new Date().toISOString(),
      });
      eventSeq.current = 3;
      const firstPassedRecord = {
        ...createdRecord,
        currentStep: 2,
        passedSteps: 1,
        score: 14,
        eventCount: 2,
      } satisfies TicketAttemptRecord;
      setAttempt(firstPassedRecord);
      await updateTicketAttempt(result.attemptId, {
        currentStep: 2,
        passedSteps: 1,
        score: 14,
        eventCount: 2,
      });
      setCloudStatus("教師雲端紀錄已建立");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setStep(2);
      setFeedback(null);
      setMessage("");
    } catch (error) {
      setFeedback("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "無法建立雲端紀錄，請請老師協助。",
      );
      setCloudStatus("Firebase尚未連線");
    } finally {
      setBusy(false);
    }
  }

  function updateField<K extends keyof PracticeState>(
    field: K,
    value: PracticeState[K],
  ) {
    const before = snapshot();
    const next = { ...state, [field]: value };
    if (field === "timeStart" || field === "timeEnd") {
      next.trainId = null;
      next.summaryChecks = [];
    }
    if (field === "destination") {
      next.trainId = null;
      next.summaryChecks = [];
    }
    if (field === "trainId") {
      next.summaryChecks = [];
    }
    setState(next);
    if (attemptId) {
      void writeEvent(
        "field_selected",
        { field, value },
        before,
        { ...next, step },
      );
    }
  }

  async function validateDateTime() {
    if (!state.travelDate) {
      await fail("請先選擇一個週末日期。", "missing_date");
      return;
    }
    if (minutesOf(state.timeStart) >= minutesOf(state.timeEnd)) {
      await fail("開始時間必須早於結束時間。", "invalid_time_range");
      return;
    }
    if (filteredTrains.length === 0) {
      await fail(
        "這個時段沒有合適的火車，請重新選擇時間。",
        "no_train_in_range",
      );
      return;
    }
    if (attemptId) {
      void updateTicketAttempt(attemptId, {
        travelDate: state.travelDate,
        timeStart: state.timeStart,
        timeEnd: state.timeEnd,
      });
    }
    await pass("選日期與搭車時段", 3);
  }

  async function validateDestination() {
    if (!state.destination) {
      await fail("請選擇集集、水里或車埕其中一站。", "missing_destination");
      return;
    }
    if (attemptId) {
      void updateTicketAttempt(attemptId, {
        destination: state.destination,
      });
    }
    await pass("選起訖站", 4);
  }

  async function validateTrain() {
    if (!selectedTrain || !filteredTrains.some((item) => item.id === selectedTrain.id)) {
      await fail("請選擇時段內的一班正式車次。", "missing_train");
      return;
    }
    const arrive = selectedTrain.arrivals[state.destination ?? "checheng"];
    if (attemptId) {
      void updateTicketAttempt(attemptId, {
        trainNumber: selectedTrain.number,
        trainType: selectedTrain.type,
        depart: selectedTrain.depart,
        arrive,
        durationMinutes: durationMinutes(selectedTrain.depart, arrive),
      });
    }
    await pass("選正式車次", 5);
  }

  async function validateSummary() {
    if (!summary || !state.travelDate) {
      await fail(
        "行程資料還沒有完整顯示，請返回前一步重新選擇。",
        "summary_data_missing",
      );
      return;
    }
    if (state.summaryChecks.length !== SUMMARY_FIELDS.length) {
      await fail("請和同伴逐項核對六個欄位。", "summary_incomplete");
      return;
    }
    await pass("核對行程摘要", 6);
  }

  async function confirmTicket() {
    await pass("確認練習車票", 7);
  }

  async function syncPdfEvidence(
    resultPdf: Blob,
    eventName: "attempt_completed" | "attempt_pdf_resynced",
    completedAtClient = new Date().toISOString(),
  ) {
    if (!attemptId || !uid) {
      throw new Error("缺少雲端學習紀錄識別碼。");
    }
    const pdfPath = await uploadAttemptPdf(uid, attemptId, resultPdf);
    await updateTicketAttempt(attemptId, {
      status: "completed",
      pdfPath,
      completedAtClient,
    });
    await writeEvent(eventName, {
      score: 100,
      pdfPath,
      recordingStatus,
    });
    setPdfSynced(true);
    setCloudStatus("教師已收到完整紀錄與7頁PDF");
    setMessage("任務完成！Great job!");
  }

  async function retryPdfSync() {
    if (!pdf) return;
    setBusy(true);
    setCloudStatus("正在重新同步7頁PDF…");
    try {
      await syncPdfEvidence(pdf, "attempt_pdf_resynced");
    } catch (error) {
      console.error("ticket-evidence-resync-failed", error);
      setPdfSynced(false);
      setCloudStatus("PDF尚未同步，請下載後交給老師");
      setMessage("重新同步未完成；請稍後再試或下載PDF交給老師。");
    } finally {
      setBusy(false);
    }
  }

  async function finishPractice() {
    if (qaMode) {
      setBusy(true);
      const nextCaptures = await pass("完成任務");
      const resultPdf = await buildEvidencePdf(
        nextCaptures,
        state.studentId,
        "qa-local-preview",
      );
      setPdf(resultPdf);
      setCloudStatus("本機QA已完成7頁PDF");
      setMessage("任務完成！Great job!");
      setBusy(false);
      return;
    }
    if (!attemptId || !uid) return;
    setBusy(true);
    try {
      const nextCaptures = await pass("完成任務");
      const resultPdf = await buildEvidencePdf(
        nextCaptures,
        state.studentId,
        attemptId,
      );
      setPdf(resultPdf);
      setPdfSynced(false);
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      const completedAtClient = new Date().toISOString();
      await updateTicketAttempt(attemptId, {
        status: "pdf_pending",
        completedAtClient,
        currentStep: 7,
        passedSteps: 7,
        score: 100,
      });
      await syncPdfEvidence(
        resultPdf,
        "attempt_completed",
        completedAtClient,
      );
    } catch (error) {
      console.error("ticket-evidence-upload-failed", error);
      setPdfSynced(false);
      setCloudStatus("PDF尚未同步，請下載後交給老師");
      setMessage("任務已完成；雲端暫時無法接收PDF。");
    } finally {
      setBusy(false);
    }
  }

  function handleStudentId(event: ChangeEvent<HTMLInputElement>) {
    updateField(
      "studentId",
      event.target.value.replace(/\D/g, "").slice(0, 5),
    );
  }

  function journeySummary() {
    if (!selectedDestination || !selectedTrain) return null;
    const arrive = selectedTrain.arrivals[selectedDestination.id];
    return {
      destination: `${selectedDestination.zh} ${selectedDestination.en}`,
      train: `${selectedTrain.type} ${selectedTrain.number}`,
      depart: selectedTrain.depart,
      arrive,
      duration: durationMinutes(selectedTrain.depart, arrive),
    };
  }

  const summary = journeySummary();
  const summaryValues = {
    from: "二水 Ershui",
    to: summary?.destination ?? "",
    date: state.travelDate,
    train: summary?.train ?? "",
    depart: summary?.depart ?? "",
    arrive: summary?.arrive ?? "",
  };

  return (
    <main className="practice-shell">
      <header className="practice-header">
        <button type="button" className="ghost-button" onClick={onHome}>
          ← 回課程首頁
        </button>
        <div className="practice-brand-block">
          <small>坐火車趣集集｜第4節數位教材</small>
          <div className="practice-title-row">
            <h1>火車線上購票網站</h1>
            <p>Buy Train Tickets Online</p>
          </div>
        </div>
        <button
          type="button"
          className="sound-button"
          onClick={() => setMuted((current) => !current)}
          aria-pressed={muted}
        >
          {muted ? "🔇 開啟音效" : "🔊 關閉音效"}
        </button>
      </header>

      <section className="practice-layout">
        <aside className="mission-card">
          <div className="mission-train" aria-hidden="true">🚆</div>
          <span className="eyebrow">YOUR MISSION</span>
          <h2>從二水出發</h2>
          <p>
            選一個週末日期與搭車時段，再從正式車次中完成一張練習車票。
          </p>
          <div className="route-mini">
            <strong>二水 Ershui</strong>
            <span>→</span>
            <strong>{selectedDestination?.zh ?? "目的地"}</strong>
          </div>
          <div className="cloud-chip">{cloudStatus}</div>
          <a href={SCHEDULE_SOURCE.url} target="_blank" rel="noreferrer">
            車次來源：臺鐵官方（查證 {SCHEDULE_SOURCE.checkedAt}）
          </a>
          <p className="privacy-note">
            只輸入學號，不輸入姓名、電話或付款資料。本活動不會真的訂票。
          </p>
        </aside>

        <section className="practice-main">
          <div className="progress-panel">
            <div className="progress-copy">
              <strong>第 {step}／7 步</strong>
              <span>{STEP_TITLES[step - 1]}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(step / 7) * 100}%` }} />
            </div>
            <ol>
              {STEP_TITLES.map((title, index) => (
                <li
                  key={title}
                  className={
                    index + 1 < step
                      ? "done"
                      : index + 1 === step
                        ? "active"
                        : ""
                  }
                >
                  <span>{index + 1 < step ? "✓" : index + 1}</span>
                  <small>{title}</small>
                </li>
              ))}
            </ol>
          </div>

          <div
            className={`step-card ${feedback ? `step-card--${feedback}` : ""}`}
            ref={evidenceRef}
            data-evidence-region
          >
            <div className="step-heading">
              <span>STEP {step}</span>
              <h2>{STEP_TITLES[step - 1]}</h2>
              <p>
                {step === 1 && "輸入五位數學號，建立你的學習紀錄。"}
                {step === 2 && "先選日期，再選預計到二水車站搭車的時間範圍。"}
                {step === 3 && "出發站固定二水，請選一個想前往的集集線車站。"}
                {step === 4 && "只會顯示你所選時段內，從二水出發的正式車次。"}
                {step === 5 && "和同伴一起檢查 from、to、date、train、depart、arrive。"}
                {step === 6 && "閱讀整張練習車票，確認行程沒有顛倒。"}
                {step === 7 && "完成最後確認，讓教師收到你的學習成果。"}
              </p>
            </div>

            {step === 1 && (
              <div className="student-start">
                <label>
                  <span>學生學號 Student ID</span>
                  <input
                    value={state.studentId}
                    onChange={handleStudentId}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="例如 40100"
                    autoFocus
                  />
                </label>
                <div className="recording-option">
                  {recordingSupported ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={recordingWanted}
                        onChange={(event) =>
                          setRecordingWanted(event.target.checked)
                        }
                      />
                      <span>
                        建立無聲畫面錄影
                        <small>
                          按開始後請選「目前這個分頁」並允許分享；只錄畫面、不錄聲音，也可以取消。
                        </small>
                      </span>
                    </label>
                  ) : (
                    <p>此iPad／瀏覽器不支援網頁錄影，仍會保存操作動畫與7頁PDF。</p>
                  )}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void startPractice()}
                >
                  {busy ? "連線中…" : "Start／開始練習"}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="date-time-step">
                <fieldset>
                  <legend>① 選日期 Choose a date</legend>
                  <div className="date-grid">
                    {weekends.map((date) => (
                      <label
                        key={date.iso}
                        className={state.travelDate === date.iso ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="travel-date"
                          value={date.iso}
                          checked={state.travelDate === date.iso}
                          onChange={() => updateField("travelDate", date.iso)}
                        />
                        <span className="calendar-top">{date.weekday}</span>
                        <strong>{date.label}</strong>
                        <small>{date.iso}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>② 選搭車時段 Choose a time range</legend>
                  <div className="time-range">
                    <label>
                      <span>開始 Start</span>
                      <select
                        value={state.timeStart}
                        onChange={(event) =>
                          updateField("timeStart", event.target.value)
                        }
                      >
                        {times.map((time) => (
                          <option key={time}>{time}</option>
                        ))}
                      </select>
                    </label>
                    <span className="time-arrow">→</span>
                    <label>
                      <span>結束 End</span>
                      <select
                        value={state.timeEnd}
                        onChange={(event) =>
                          updateField("timeEnd", event.target.value)
                        }
                      >
                        {times.map((time) => (
                          <option key={time}>{time}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="range-preview">
                    <span>🚉</span>
                    <p>
                      二水站發車時間落在 <strong>{state.timeStart}–{state.timeEnd}</strong>{" "}
                      的班次共有 <strong>{filteredTrains.length}</strong> 班。
                    </p>
                  </div>
                </fieldset>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void validateDateTime()}
                >
                  查詢這個時段
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="route-step">
                <div className="fixed-origin">
                  <span>出發站 From</span>
                  <strong>3430　二水 Ershui</strong>
                  <small>集集線起點</small>
                </div>
                <div className="route-arrow" aria-hidden="true">⇄</div>
                <fieldset>
                  <legend>抵達站 To</legend>
                  <div className="destination-grid">
                    {DESTINATIONS.map((destination) => (
                      <label
                        key={destination.id}
                        className={
                          state.destination === destination.id ? "selected" : ""
                        }
                      >
                        <input
                          type="radio"
                          name="destination"
                          checked={state.destination === destination.id}
                          onChange={() =>
                            updateField("destination", destination.id)
                          }
                        />
                        <span>{destination.emoji}</span>
                        <strong>
                          {destination.zh} {destination.en}
                        </strong>
                        <small>{destination.clue}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void validateDestination()}
                >
                  確認起訖站
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="train-step">
                <div className="search-summary">
                  <span>搜尋條件</span>
                  <strong>
                    二水 → {selectedDestination?.zh}｜{state.timeStart}–{state.timeEnd}
                  </strong>
                  <small>{state.travelDate}</small>
                </div>
                {filteredTrains.length ? (
                  <div className="train-list">
                    {filteredTrains.map((train) => {
                      const arrive =
                        train.arrivals[state.destination ?? "checheng"];
                      return (
                        <label
                          key={train.id}
                          className={state.trainId === train.id ? "selected" : ""}
                        >
                          <input
                            type="radio"
                            name="train"
                            checked={state.trainId === train.id}
                            onChange={() => updateField("trainId", train.id)}
                          />
                          <span className="train-icon">🚆</span>
                          <div>
                            <small>車種車次</small>
                            <strong>
                              {train.type} {train.number}
                            </strong>
                          </div>
                          <div className="train-time">
                            <span>{train.depart}</span>
                            <i>→</i>
                            <span>{arrive}</span>
                          </div>
                          <div>
                            <small>行駛時間</small>
                            <strong>
                              {durationMinutes(train.depart, arrive)} 分
                            </strong>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-train">
                    <span>🕰️</span>
                    <h3>這個時段沒有合適的火車</h3>
                    <p>請返回上一步，重新選擇時間。</p>
                  </div>
                )}
                <div className="step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setStep(2)}
                  >
                    修改時段
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void validateTrain()}
                  >
                    選擇這班火車
                  </button>
                </div>
              </div>
            )}

            {step === 5 && summary && (
              <div className="summary-step">
                <div className="summary-route">
                  <div className="summary-meta">
                    <div>
                      <small>DATE／日期</small>
                      <strong>{state.travelDate}</strong>
                    </div>
                    <div>
                      <small>TRAIN／車次</small>
                      <strong>{summary.train}</strong>
                    </div>
                  </div>
                  <div className="summary-route-main">
                    <div>
                      <small>FROM／出發站</small>
                      <strong>二水 Ershui</strong>
                      <span><small>DEPART</small>{summary.depart}</span>
                    </div>
                    <div className="summary-line"><span>🚆</span></div>
                    <div>
                      <small>TO／抵達站</small>
                      <strong>{summary.destination}</strong>
                      <span><small>ARRIVAL</small>{summary.arrive}</span>
                    </div>
                  </div>
                </div>
                <div className="summary-checks">
                  {SUMMARY_FIELDS.map(([id, label]) => {
                    const value = summaryValues[id];
                    const checked = state.summaryChecks.includes(id);
                    return (
                      <label
                        key={id}
                        className={`${checked ? "checked" : ""} ${!value ? "disabled" : ""}`.trim()}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!value}
                          onChange={() => {
                            const next = checked
                              ? state.summaryChecks.filter((item) => item !== id)
                              : [...state.summaryChecks, id];
                            updateField("summaryChecks", next);
                          }}
                        />
                        <span className="summary-checkmark">✓</span>
                        <span className="summary-check-copy">
                          <strong>{label}</strong>
                          <b>{value || "尚未選擇"}</b>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="partner-prompt">
                  👥 Checker asks: “Is the train number right?” Operator answers: “Yes, it is.”
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void validateSummary()}
                >
                  六項都核對完成
                </button>
              </div>
            )}

            {step === 6 && summary && (
              <div className="ticket-step">
                <PracticeTicket
                  studentId={state.studentId}
                  date={state.travelDate}
                  destination={summary.destination}
                  train={summary.train}
                  depart={summary.depart}
                  arrive={summary.arrive}
                />
                <div className="safety-reminder">
                  <span>🛡️</span>
                  <p>
                    這是課堂練習票，不是真的訂票。不要拍攝或分享真實條碼、訂票代碼與個人資料。
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void confirmTicket()}
                >
                  Confirm／確認練習車票
                </button>
              </div>
            )}

            {step === 7 && summary && (
              <div className="success-step">
                <div className="celebration" aria-hidden="true">
                  <span>🎉</span><span>⭐</span><span>🎊</span>
                </div>
                <h2>最後一站：完成學習紀錄</h2>
                <p>
                  你已完成二水到{selectedDestination?.zh}的車次查詢與車票核對。
                </p>
                <div className="score-card">
                  <span>目前分數 SCORE</span>
                  <strong>{pdf ? "100" : attempt?.score ?? 86}</strong>
                  <small>／100</small>
                </div>
                {!pdf ? (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={busy}
                    onClick={() => void finishPractice()}
                  >
                    {busy ? "正在整理成果…" : "完成並交給老師"}
                  </button>
                ) : (
                  <div className="finish-actions">
                    {!pdfSynced && (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busy}
                        onClick={() => void retryPdfSync()}
                      >
                        {busy ? "正在重新同步…" : "重新同步給老師"}
                      </button>
                    )}
                    <button
                      type="button"
                      className={pdfSynced ? "primary-button" : "secondary-button"}
                      onClick={() =>
                        downloadBlob(
                          pdf,
                          `${state.studentId}_${state.travelDate}_坐火車趣集集.pdf`,
                        )
                      }
                    >
                      下載7頁學習紀錄PDF
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => window.location.reload()}
                    >
                      下一位學生
                    </button>
                  </div>
                )}
                <p className="recording-status">
                  無聲錄影：{recordingStatus === "recorded"
                    ? "已儲存"
                    : recordingStatus === "unsupported"
                      ? "此裝置不支援；已改存操作動畫"
                      : recordingStatus === "declined"
                        ? "未授權；已改存操作動畫"
                        : "處理中"}
                </p>
              </div>
            )}

            {message && (
              <div
                className={`feedback-box feedback-box--${feedback ?? "info"}`}
                role="status"
                aria-live="polite"
              >
                <strong>
                  {feedback === "correct" ? "✓" : feedback === "error" ? "!" : "i"}
                </strong>
                <span>{message}</span>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PracticeTicket({
  studentId,
  date,
  destination,
  train,
  depart,
  arrive,
}: {
  studentId: string;
  date: string;
  destination: string;
  train: string;
  depart: string;
  arrive: string;
}) {
  const [destinationZh, destinationEn] = destination.split(" ");
  return (
    <article className="practice-ticket">
      <header>
        <div>
          <small>ERHSUI RAILWAY LEARNING</small>
          <h3>集集線練習車票</h3>
        </div>
        <span>PRACTICE</span>
      </header>
      <div className="ticket-art-strip" aria-hidden="true">
        <img src="/assets/ticket-railway-dopamine-v1.png" alt="" />
      </div>
      <div className="ticket-information">
        <aside className="ticket-meta">
          <div>
            <small>DATE</small>
            <strong>{date}</strong>
          </div>
          <div>
            <small>TRAIN</small>
            <strong>{train}</strong>
          </div>
        </aside>
        <div className="ticket-route">
          <div className="ticket-station">
            <small>FROM</small>
            <strong>二水</strong>
            <span>Ershui</span>
            <div className="ticket-time ticket-time--depart">
              <small>DEPART</small>
              <b>{depart}</b>
            </div>
          </div>
          <i aria-hidden="true"><span>🚆</span>→</i>
          <div className="ticket-station ticket-station--arrival">
            <small>TO</small>
            <strong>{destinationZh}</strong>
            <span>{destinationEn}</span>
            <div className="ticket-time">
              <small>ARRIVAL</small>
              <b>{arrive}</b>
            </div>
            <div className="ticket-student">
              <small>STUDENT</small>
              <b>{studentId}</b>
            </div>
          </div>
        </div>
      </div>
      <footer>教學練習使用｜不可作為真實車票乘車</footer>
    </article>
  );
}
