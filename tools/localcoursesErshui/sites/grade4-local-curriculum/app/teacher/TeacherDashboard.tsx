"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AttemptItem = {
  attemptId: string;
  studentId: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  eventCount: number;
  errorCount: number;
  pdfReady: boolean;
};

type EventItem = {
  seq: number;
  step: string;
  action: string;
  payload: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  clientElapsedMs: number;
};

function displayStatus(status: string) {
  const labels: Record<string, string> = {
    in_progress: "進行中",
    completed_pending_evidence: "等待 PDF",
    completed: "已完成",
    sync_pending: "等待同步",
    deletion_pending: "刪除中",
  };
  return labels[status] ?? status;
}

function eventLabel(event: EventItem) {
  const actions: Record<string, string> = {
    attempt_started: "開始練習",
    field_selected: "完成選擇",
    validation_failed: "答錯並修正",
    swap: "交換起訖站",
    back: "返回上一步",
    step_passed: "步驟過關",
    attempt_completed: "完成練習",
  };
  return actions[event.action] ?? event.action;
}

export function TeacherDashboard() {
  const [items, setItems] = useState<AttemptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (studentFilter) query.set("studentId", studentFilter);
    if (statusFilter) query.set("status", statusFilter);
    const response = await fetch(`/api/teacher/attempts?${query}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { items: AttemptItem[] };
      setItems(data.items);
      setSelectedId((current) =>
        current && data.items.some((item) => item.attemptId === current)
          ? current
          : data.items[0]?.attemptId ?? null,
      );
    }
    setLoading(false);
  }, [statusFilter, studentFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => void loadItems(), 250);
    return () => window.clearTimeout(handle);
  }, [loadItems]);

  useEffect(() => {
    if (!selectedId) return;
    async function loadEvents() {
      const response = await fetch(
        `/api/teacher/attempts/${encodeURIComponent(selectedId ?? "")}/events`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as { events?: EventItem[] };
      setEvents(data.events ?? []);
      setReplayIndex(-1);
      setPlaying(false);
    }
    void loadEvents();
  }, [selectedId]);

  useEffect(() => {
    if (!playing || events.length === 0) return;
    const delay = Math.max(360, 1000 / speed);
    timer.current = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= events.length - 1) {
          setPlaying(false);
          return events.length - 1;
        }
        return current + 1;
      });
    }, delay);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [events.length, playing, speed]);

  const selected = useMemo(
    () => items.find((item) => item.attemptId === selectedId) ?? null,
    [items, selectedId],
  );
  const replayEvent = replayIndex >= 0 ? events[replayIndex] : null;

  async function deleteAttempt() {
    if (!selected) return;
    const confirmation = window.prompt(
      `刪除學號 ${selected.studentId} 的這一次紀錄？請輸入 DELETE 確認。`,
    );
    if (confirmation !== "DELETE") return;
    const response = await fetch(
      `/api/teacher/attempts/${selected.attemptId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation,
          reason: "teacher_manual_delete",
        }),
      },
    );
    if (response.ok) await loadItems();
  }

  async function cleanupExpired() {
    if (!window.confirm("清理保存期超過一年的紀錄？系統會先刪除 PDF，再刪除學習資料。")) {
      return;
    }
    const response = await fetch("/api/teacher/retention/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 25 }),
    });
    if (response.ok) {
      const result = (await response.json()) as {
        deleted: number;
        failed: number;
      };
      window.alert(`已清理 ${result.deleted} 筆；失敗 ${result.failed} 筆。`);
      await loadItems();
    }
  }

  return (
    <section className="dashboard-grid">
      <aside className="attempt-panel">
        <div className="panel-heading">
          <div>
            <span>ATTEMPTS</span>
            <h2>學生練習紀錄</h2>
          </div>
          <div className="panel-tools">
            <Link href="/api/teacher/attempts/export" className="icon-button">
              匯出 CSV
            </Link>
            <button
              type="button"
              className="icon-button"
              onClick={() => void cleanupExpired()}
            >
              清理逾期
            </button>
          </div>
        </div>
        <div className="teacher-filters">
          <label>
            <span>學號</span>
            <input
              inputMode="numeric"
              maxLength={5}
              value={studentFilter}
              onChange={(event) =>
                setStudentFilter(event.target.value.replace(/\D/g, ""))
              }
              placeholder="例如 40100"
            />
          </label>
          <label>
            <span>同步狀態</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">全部</option>
              <option value="in_progress">進行中</option>
              <option value="completed_pending_evidence">等待 PDF</option>
              <option value="completed">已完成</option>
              <option value="sync_pending">等待同步</option>
            </select>
          </label>
        </div>
        <div className="attempt-list" aria-live="polite">
          {loading ? <p className="empty-state">讀取中…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="empty-state">目前沒有符合條件的紀錄。</p>
          ) : null}
          {items.map((item) => (
            <button
              type="button"
              key={item.attemptId}
              className={item.attemptId === selectedId ? "selected" : ""}
              onClick={() => setSelectedId(item.attemptId)}
            >
              <span className="attempt-date">
                {new Date(item.startedAt).toLocaleDateString("zh-TW")}
              </span>
              <strong>{item.studentId}</strong>
              <small>
                {displayStatus(item.status)} · {item.eventCount} 個事件
              </small>
            </button>
          ))}
        </div>
      </aside>

      <article className="detail-panel">
        {!selected ? (
          <div className="empty-detail">
            <span aria-hidden="true">🚉</span>
            <h2>選一筆紀錄查看</h2>
          </div>
        ) : (
          <>
            <div className="detail-heading">
              <div>
                <span>學號 STUDENT ID</span>
                <h2>{selected.studentId}</h2>
                <p>紀錄尾碼 {selected.attemptId.slice(-6)}</p>
              </div>
              <div className="detail-actions">
                {selected.pdfReady ? (
                  <a
                    className="button-primary"
                    href={`/api/teacher/attempts/${selected.attemptId}/evidence?disposition=inline`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看七頁 PDF
                  </a>
                ) : (
                  <span className="pdf-pending">PDF 尚未同步</span>
                )}
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => void deleteAttempt()}
                >
                  刪除此紀錄
                </button>
              </div>
            </div>

            <div className="stat-grid">
              <div>
                <span>狀態</span>
                <strong>{displayStatus(selected.status)}</strong>
              </div>
              <div>
                <span>錯誤／修正</span>
                <strong>{selected.errorCount}</strong>
              </div>
              <div>
                <span>事件數</span>
                <strong>{selected.eventCount}</strong>
              </div>
              <div>
                <span>完成時間</span>
                <strong>
                  {selected.completedAt
                    ? new Date(selected.completedAt).toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </strong>
              </div>
            </div>

            <section className="replay-card">
              <div className="replay-controls">
                <div>
                  <span>EVENT REPLAY</span>
                  <h3>作答過程動畫重播</h3>
                </div>
                <div className="replay-buttons">
                  <select
                    aria-label="重播速度"
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                  </select>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => {
                      if (replayIndex >= events.length - 1) setReplayIndex(-1);
                      setPlaying((current) => !current);
                    }}
                  >
                    {playing ? "暫停" : "開始重播"}
                  </button>
                </div>
              </div>
              <div className="replay-stage" aria-live="polite">
                <div className="replay-track">
                  <div
                    className="replay-train"
                    style={{
                      left:
                        events.length > 1
                          ? `${Math.max(0, replayIndex) / (events.length - 1) * 88}%`
                          : "0%",
                    }}
                  >
                    🚂
                  </div>
                </div>
                {replayEvent ? (
                  <div className="replay-event">
                    <span>
                      #{replayEvent.seq} · {(replayEvent.clientElapsedMs / 1000).toFixed(1)} 秒
                    </span>
                    <strong>{eventLabel(replayEvent)}</strong>
                    <p>步驟：{replayEvent.step}</p>
                  </div>
                ) : (
                  <p className="replay-hint">
                    按「開始重播」，網站會依時間順序呈現每次選擇、錯誤與修正；不含聲音或真實螢幕錄影。
                  </p>
                )}
              </div>
              <ol className="event-timeline">
                {events.map((event, index) => (
                  <li
                    key={event.seq}
                    className={index === replayIndex ? "active" : ""}
                  >
                    <span>{event.seq}</span>
                    <div>
                      <strong>{eventLabel(event)}</strong>
                      <small>
                        {event.step} · {(event.clientElapsedMs / 1000).toFixed(1)} 秒
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </article>
    </section>
  );
}
