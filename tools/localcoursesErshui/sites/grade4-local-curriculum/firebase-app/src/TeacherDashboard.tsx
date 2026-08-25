import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addTeacherAudit,
  backfillPracticeDates,
  deleteAttemptAsTeacher,
  getAttemptPdfUrl,
  getAttemptRecordingUrl,
  getFirebaseServices,
  listTicketAttempts,
  listTicketEvents,
  teacherSignIn,
  teacherSignOut,
  type TicketAttemptRecord,
  type TicketEventRecord,
} from "./firebase";
import { destinationById, trainById } from "./schedule";

function statusLabel(status: TicketAttemptRecord["status"]) {
  return {
    in_progress: "進行中",
    completed: "已完成",
    pdf_pending: "PDF等待同步",
  }[status];
}

function eventLabel(action: string) {
  const labels: Record<string, string> = {
    attempt_started: "開始練習",
    field_selected: "完成選擇",
    validation_failed: "答錯並修正",
    step_passed: "步驟過關",
    attempt_completed: "完成並上傳",
    attempt_pdf_resynced: "重新同步PDF",
  };
  return labels[action] ?? action;
}

function textValue(value: unknown, fallback = "尚未選擇") {
  return typeof value === "string" && value ? value : fallback;
}

function downloadCsv(items: TicketAttemptRecord[]) {
  const header = [
    "練習日期",
    "搭車日期",
    "學號",
    "狀態",
    "分數",
    "目的地",
    "車次",
    "出發",
    "抵達",
    "錯誤次數",
    "完成時間",
  ];
  const rows = items.map((item) => [
    item.practiceDateTaipei ?? "未確認",
    item.travelDate ?? "",
    item.studentId,
    statusLabel(item.status),
    item.score,
    item.destination ?? "",
    `${item.trainType ?? ""} ${item.trainNumber ?? ""}`.trim(),
    item.depart ?? "",
    item.arrive ?? "",
    item.errorCount,
    item.completedAtClient ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `坐火車趣集集_教師紀錄_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReplayPracticeScreen({
  record,
  event,
}: {
  record: TicketAttemptRecord;
  event: TicketEventRecord | null;
}) {
  const state = (event?.after ?? {}) as Record<string, unknown>;
  const step = Number(state.step ?? event?.step ?? 1);
  const destinationId =
    state.destination === "jiji" ||
    state.destination === "shuili" ||
    state.destination === "checheng"
      ? state.destination
      : null;
  const destination = destinationById(
    destinationId,
  );
  const train = trainById(
    typeof state.trainId === "string" ? state.trainId : null,
  );
  const checks = Array.isArray(state.summaryChecks)
    ? state.summaryChecks.filter((value): value is string =>
        typeof value === "string",
      )
    : [];
  const travelDate = textValue(state.travelDate);
  const timeStart = textValue(state.timeStart, "09:00");
  const timeEnd = textValue(state.timeEnd, "12:00");
  const arrival =
    train && destination ? train.arrivals[destination.id] : record.arrive;
  const errorMessage =
    event?.action === "validation_failed"
      ? textValue(event.payload.message, "請檢查答案後再試一次。")
      : "";

  return (
    <div className="ui-replay-window" aria-live="polite">
      <div className="ui-replay-browserbar">
        <span />
        <span />
        <span />
        <b>火車線上購票網站 · Buy Train Tickets Online</b>
      </div>
      <div className="ui-replay-progress">
        {Array.from({ length: 7 }, (_, index) => (
          <span
            key={index}
            className={index + 1 <= step ? "active" : ""}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <div className="ui-replay-content">
        <small>STEP {step}</small>
        <h4>
          {
            [
              "輸入學號",
              "選日期與搭車時段",
              "選起訖站",
              "選正式車次",
              "核對行程摘要",
              "確認練習車票",
              "完成任務",
            ][Math.max(0, Math.min(6, step - 1))]
          }
        </h4>

        {step === 1 && (
          <div className="ui-replay-form">
            <label>
              <span>學生學號 Student ID</span>
              <b>{textValue(state.studentId, record.studentId)}</b>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="ui-replay-choice-grid">
            <div>
              <span>搭車日期 Travel date</span>
              <b>{travelDate}</b>
            </div>
            <div>
              <span>搭車時段 Time</span>
              <b>{timeStart}–{timeEnd}</b>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="ui-replay-route">
            <div><small>FROM</small><b>二水 Ershui</b></div>
            <i>→</i>
            <div>
              <small>TO</small>
              <b>{destination ? `${destination.zh} ${destination.en}` : "尚未選擇"}</b>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ui-replay-train">
            <span>選擇車次 Choose a train</span>
            <b>
              {train
                ? `${train.type} ${train.number}｜${train.depart} → ${arrival}`
                : "尚未選擇車次"}
            </b>
          </div>
        )}

        {step === 5 && (
          <div className="ui-replay-summary">
            {[
              ["from", "From／出發站", "二水 Ershui"],
              ["to", "To／抵達站", destination ? `${destination.zh} ${destination.en}` : "尚未選擇"],
              ["date", "Date／日期", travelDate],
              ["train", "Train／車次", train ? `${train.type} ${train.number}` : "尚未選擇"],
              ["depart", "Depart／出發", train?.depart ?? record.depart ?? "尚未選擇"],
              ["arrive", "Arrive／抵達", arrival ?? "尚未選擇"],
            ].map(([key, label, value]) => (
              <div key={key} className={checks.includes(key) ? "checked" : ""}>
                <span>{checks.includes(key) ? "✓" : "□"} {label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="ui-replay-ticket">
            <header><b>集集線練習車票</b><span>PRACTICE</span></header>
            <div><small>DATE</small><b>{travelDate}</b></div>
            <div><small>TRAIN</small><b>{train ? `${train.type} ${train.number}` : "—"}</b></div>
            <div><small>FROM / DEPART</small><b>二水 Ershui · {train?.depart ?? "—"}</b></div>
            <div><small>TO / ARRIVAL</small><b>{destination?.zh ?? "—"} · {arrival ?? "—"}</b></div>
          </div>
        )}

        {step === 7 && (
          <div className="ui-replay-complete">
            <span>🎉</span>
            <h4>任務完成！Great job!</h4>
            <b>{record.score}／100</b>
          </div>
        )}

        {errorMessage && (
          <div className="ui-replay-error">
            <strong>請再試一次</strong>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
      <footer>
        {event ? (
          <>
            <b>#{event.seq} {eventLabel(event.action)}</b>
            <span>第{event.step}步 · {(event.clientElapsedMs / 1000).toFixed(1)}秒</span>
          </>
        ) : (
          <span>按「開始重播」，觀看學生當時看到的操作畫面。</span>
        )}
      </footer>
    </div>
  );
}

export function TeacherDashboard({ onHome }: { onHome: () => void }) {
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [items, setItems] = useState<TicketAttemptRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<TicketEventRecord[]>([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const replayTimer = useRef<number | null>(null);
  const backfillStarted = useRef(false);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    void getFirebaseServices()
      .then(({ auth }) => {
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          if (!nextUser || nextUser.isAnonymous) {
            setAuthorized(false);
            setAuthLoading(false);
            return;
          }
          const token = await nextUser.getIdTokenResult(true);
          setAuthorized(token.claims.teacher === true);
          setAuthLoading(false);
        });
      })
      .catch(() => setAuthLoading(false));
    return () => unsubscribe();
  }, []);

  async function loadAttempts() {
    if (!authorized) return;
    setLoading(true);
    try {
      const records = await listTicketAttempts({
        studentId: studentFilter || undefined,
        practiceDateTaipei: dateFilter || undefined,
      });
      setItems(records);
      setSelectedId((current) =>
        current && records.some((item) => item.attemptId === current)
          ? current
          : records[0]?.attemptId ?? null,
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "讀取紀錄失敗。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authorized) return;
    const handle = window.setTimeout(() => void loadAttempts(), 220);
    return () => window.clearTimeout(handle);
  }, [authorized, studentFilter, dateFilter]);

  useEffect(() => {
    if (!authorized || backfillStarted.current) return;
    backfillStarted.current = true;
    void backfillPracticeDates()
      .then(() => loadAttempts())
      .catch(() => {
        // The dashboard remains usable even if a legacy record cannot be dated.
      });
  }, [authorized]);

  useEffect(() => {
    if (!selectedId || !authorized) {
      setEvents([]);
      return;
    }
    void listTicketEvents(selectedId)
      .then((records) => {
        setEvents(records);
        setReplayIndex(-1);
        setPlaying(false);
      })
      .catch(() => setEvents([]));
  }, [authorized, selectedId]);

  const selected = useMemo(
    () => items.find((item) => item.attemptId === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    setRecordingUrl("");
    if (!selected?.recordingPath) {
      setRecordingLoading(false);
      return;
    }
    let active = true;
    setRecordingLoading(true);
    void getAttemptRecordingUrl(selected.recordingPath)
      .then((url) => {
        if (active) setRecordingUrl(url);
      })
      .catch(() => {
        if (active) setRecordingUrl("");
      })
      .finally(() => {
        if (active) setRecordingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected?.attemptId, selected?.recordingPath]);

  useEffect(() => {
    if (!playing || events.length === 0) return;
    const current = replayIndex;
    if (current >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const next = current + 1;
    const previousTime = current >= 0 ? events[current].clientElapsedMs : 0;
    const nextTime = events[next].clientElapsedMs;
    const delay = Math.min(2500, Math.max(350, (nextTime - previousTime) / speed));
    replayTimer.current = window.setTimeout(() => {
      setReplayIndex(next);
    }, delay);
    return () => {
      if (replayTimer.current) window.clearTimeout(replayTimer.current);
    };
  }, [events, playing, replayIndex, speed]);

  const currentEvent = replayIndex >= 0 ? events[replayIndex] : null;

  async function handleLogin() {
    setAuthLoading(true);
    setAuthError("");
    try {
      await teacherSignIn(password);
      setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "登入失敗，請稍後再試。");
    } finally {
      setAuthLoading(false);
    }
  }

  async function openPdf() {
    if (!selected?.pdfPath) return;
    const url = await getAttemptPdfUrl(selected.pdfPath);
    window.open(url, "_blank", "noopener,noreferrer");
    void addTeacherAudit("evidence_opened", {
      attemptId: selected.attemptId,
      studentId: selected.studentId,
    });
  }

  async function deleteSelected() {
    if (!selected) return;
    if (deleteConfirmation !== "DELETE") return;
    await deleteAttemptAsTeacher(selected);
    await addTeacherAudit("attempt_deleted", {
      attemptId: selected.attemptId,
      studentId: selected.studentId,
    });
    setDeleteOpen(false);
    setDeleteConfirmation("");
    await loadAttempts();
  }

  if (authLoading) {
    return (
      <main className="teacher-shell">
        <div className="loading-card">正在確認教師權限…</div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="teacher-login-shell">
        <button type="button" className="ghost-button" onClick={onHome}>
          ← 回課程首頁
        </button>
        <section className="teacher-login-card">
          <span className="teacher-lock">🔐</span>
          <small>TEACHER ONLY</small>
          <h1>教師後台</h1>
          <p>請輸入教師密碼，開啟學生學習紀錄。</p>
          <label>
            <span>教師密碼</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-label="教師密碼"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleLogin();
              }}
            />
          </label>
          {authError ? <p className="auth-error">{authError}</p> : null}
          <button
            type="button"
            className="primary-button"
            disabled={!password || authLoading}
            onClick={() => void handleLogin()}
          >
            安全登入
          </button>
          <p className="login-help">
            密碼以圓點遮蔽，不會顯示在頁面或儲存在瀏覽器程式中。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <div>
          <button type="button" className="teacher-home" onClick={onHome}>
            ← 回課程首頁
          </button>
          <h1>教師後台</h1>
          <p>學生購票歷程 · 畫面重播 · 7頁學習證據</p>
        </div>
        <div className="teacher-account">
          <span>教師安全工作階段</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void teacherSignOut()}
          >
            登出
          </button>
        </div>
      </header>
      {authError ? (
        <div className="teacher-data-error" role="alert">
          資料讀取提示：{authError}
        </div>
      ) : null}

      <section className="dashboard-grid">
        <aside className="attempt-panel">
          <div className="panel-heading">
            <div>
              <small>LEARNING RECORDS</small>
              <h2>學生練習紀錄</h2>
            </div>
            <button
              type="button"
              className="compact-button"
              onClick={() => downloadCsv(items)}
            >
              匯出CSV
            </button>
          </div>
          <div className="teacher-filters">
            <label>
              <span>練習日期（按下開始的日期）</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>
            <label>
              <span>學生學號</span>
              <input
                inputMode="numeric"
                maxLength={5}
                value={studentFilter}
                onChange={(event) =>
                  setStudentFilter(event.target.value.replace(/\D/g, ""))
                }
                placeholder="例如40100"
              />
            </label>
          </div>
          <div className="attempt-list">
            {loading ? <p>讀取中…</p> : null}
            {!loading && items.length === 0 ? (
              <p>此練習日期沒有符合條件的學生紀錄。</p>
            ) : null}
            {items.map((item) => (
              <button
                type="button"
                key={item.attemptId}
                className={item.attemptId === selectedId ? "selected" : ""}
                onClick={() => setSelectedId(item.attemptId)}
              >
                <span className="attempt-date">
                  {item.practiceDateTaipei ?? "日期未確認"}
                </span>
                <strong>{item.studentId}</strong>
                <small>{statusLabel(item.status)} · {item.score}分</small>
              </button>
            ))}
          </div>
        </aside>

        <article className="detail-panel">
          {!selected ? (
            <div className="empty-detail">
              <span>🚉</span>
              <h2>選一筆紀錄查看</h2>
            </div>
          ) : (
            <>
              <div className="detail-heading">
                <div>
                  <small>STUDENT ID</small>
                  <h2>{selected.studentId}</h2>
                  <p>
                    練習日期：{selected.practiceDateTaipei ?? "未確認"} ·
                    搭車日期：{selected.travelDate ?? "尚未選擇"}
                  </p>
                </div>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!selected.pdfPath}
                    onClick={() => void openPdf()}
                  >
                    查看7頁PDF
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      setDeleteConfirmation("");
                      setDeleteOpen(true);
                    }}
                  >
                    刪除紀錄
                  </button>
                </div>
              </div>

              <div className="stat-grid">
                <div><span>狀態</span><strong>{statusLabel(selected.status)}</strong></div>
                <div><span>分數</span><strong>{selected.score}</strong></div>
                <div><span>錯誤／修正</span><strong>{selected.errorCount}</strong></div>
                <div><span>事件數</span><strong>{selected.eventCount}</strong></div>
                <div><span>車次</span><strong>{selected.trainType} {selected.trainNumber}</strong></div>
                <div><span>出發</span><strong>{selected.depart ?? "—"}</strong></div>
                <div><span>抵達</span><strong>{selected.arrive ?? "—"}</strong></div>
                <div>
                  <span>作答畫面</span>
                  <strong>{selected.recordingPath ? "無聲錄影" : "介面重建動畫"}</strong>
                </div>
              </div>

              <section className="replay-card">
                <div className="replay-heading">
                  <div>
                    <small>SCREEN REPLAY</small>
                    <h3>依時間順序重播作答畫面</h3>
                  </div>
                </div>

                {recordingLoading ? <p className="replay-note">正在載入無聲錄影…</p> : null}
                {recordingUrl ? (
                  <div className="recording-player">
                    <video controls playsInline preload="metadata" src={recordingUrl}>
                      瀏覽器無法播放此錄影。
                    </video>
                    <p>此影片只錄下學生分享的網頁畫面，不含聲音。</p>
                  </div>
                ) : (
                  <>
                    <p className="replay-note">
                      {selected.recordingStatus === "declined"
                        ? "學生未授權畫面分享，以下依操作事件重建當時網頁。"
                        : selected.recordingStatus === "unsupported"
                          ? "裝置不支援畫面錄影，以下依操作事件重建當時網頁。"
                          : "目前沒有可播放的錄影，以下依操作事件重建當時網頁。"}
                    </p>
                    <div className="replay-controls">
                      <label>
                        <span>播放速度 Replay speed</span>
                        <select
                          aria-label="重播速度"
                          value={speed}
                          onChange={(event) => setSpeed(Number(event.target.value))}
                        >
                          <option value={0.5}>0.5×</option>
                          <option value={1}>1×</option>
                          <option value={2}>2×</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={events.length === 0}
                        onClick={() => {
                          if (replayIndex >= events.length - 1) setReplayIndex(-1);
                          setPlaying((current) => !current);
                        }}
                      >
                        {playing ? "暫停 Pause" : "開始重播 Play"}
                      </button>
                    </div>
                    <ReplayPracticeScreen record={selected} event={currentEvent} />
                  </>
                )}

                <details className="raw-event-details">
                  <summary>查看原始操作事件（教師查核用）</summary>
                  <ol className="event-timeline">
                    {events.map((event, index) => (
                      <li
                        key={event.seq}
                        className={index === replayIndex ? "active" : ""}
                      >
                        <span>{event.seq}</span>
                        <div>
                          <strong>{eventLabel(event.action)}</strong>
                          <small>
                            第{event.step}步 · {(event.clientElapsedMs / 1000).toFixed(1)}秒
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              </section>
            </>
          )}
        </article>
      </section>
      {deleteOpen && selected ? (
        <div className="delete-modal-backdrop" role="presentation">
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <small>DELETE RECORD</small>
            <h2 id="delete-modal-title">刪除學號 {selected.studentId} 的紀錄？</h2>
            <p>此動作會刪除作答事件、PDF與錄影。請輸入 DELETE 確認。</p>
            <label>
              <span>確認文字</span>
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoFocus
              />
            </label>
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeleteOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={deleteConfirmation !== "DELETE"}
                onClick={() => void deleteSelected()}
              >
                確認刪除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
