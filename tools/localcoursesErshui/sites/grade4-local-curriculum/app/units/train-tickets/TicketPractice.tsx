"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import siteContent from "@/content/site-content.json";
import {
  listQueuedEvents,
  queueEvent,
  removeQueuedEvent,
} from "./offline-queue";

type Stage =
  | "student_id"
  | "origin"
  | "destination"
  | "date"
  | "search"
  | "train"
  | "summary"
  | "success";

type Selection = {
  origin: string | null;
  destination: string | null;
  date: string | null;
  train: string | null;
  summaryChecks: string[];
};

type Capture = {
  pageNo: number;
  stepId: string;
  title: string;
  dataUrl: string;
  checksum: string;
};

type AttemptSession = {
  attemptId: string;
  attemptToken: string;
  startedAt: number;
  nextSeq: number;
};

const practice = siteContent.trainTicketPractice;
const stages: Stage[] = [
  "origin",
  "destination",
  "date",
  "search",
  "train",
  "summary",
  "success",
];
const stepByStage = Object.fromEntries(
  practice.steps.map((step) => [step.id.replace("step.", ""), step]),
) as Record<Exclude<Stage, "student_id">, (typeof practice.steps)[number]>;

const initialSelection: Selection = {
  origin: null,
  destination: null,
  date: null,
  train: null,
  summaryChecks: [],
};

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function checksumBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return base64Url(new Uint8Array(digest));
}

async function checksumDataUrl(dataUrl: string): Promise<string> {
  return checksumBlob(await (await fetch(dataUrl)).blob());
}

function playTone(kind: "correct" | "complete") {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const audio = new AudioContextClass();
  const notes = kind === "complete" ? [523, 659, 784] : [659, 784];
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.14,
      audio.currentTime + index * 0.12 + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + index * 0.12 + 0.22,
    );
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + index * 0.12);
    oscillator.stop(audio.currentTime + index * 0.12 + 0.25);
  });
  window.setTimeout(() => void audio.close(), 900);
}

function stationName(id: string | null): string {
  if (!id) return "尚未選擇";
  const station = practice.stations.find((item) => item.id === id);
  return station ? `${station.zh} ${station.en}` : id;
}

function dateName(id: string | null): string {
  return practice.dates.find((item) => item.id === id)?.label ?? "尚未選擇";
}

function trainInfo(id: string | null) {
  return practice.trains.find((item) => item.id === id) ?? null;
}

export function TicketPractice() {
  const [studentId, setStudentId] = useState("");
  const [stage, setStage] = useState<Stage>("student_id");
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [session, setSession] = useState<AttemptSession | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncState, setSyncState] = useState<
    "online" | "offline" | "pending" | "received"
  >("online");
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
  const evidenceRef = useRef<HTMLElement>(null);
  const sessionRef = useRef<AttemptSession | null>(null);
  const selectionRef = useRef(selection);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  const currentStepIndex =
    stage === "student_id" ? 0 : stages.indexOf(stage) + 1;

  const stateSnapshot = useCallback(
    (override?: Partial<Selection>, currentStage = stage) => ({
      currentStep: currentStage,
      origin: selectionRef.current.origin,
      destination: selectionRef.current.destination,
      date: selectionRef.current.date,
      train: selectionRef.current.train,
      summaryChecks: selectionRef.current.summaryChecks,
      passedSteps: captures.map((capture) => capture.stepId),
      ...override,
    }),
    [captures, stage],
  );

  const flushOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncState("offline");
      return;
    }
    const items = await listQueuedEvents();
    if (items.length === 0) {
      setSyncState((current) => (current === "received" ? current : "online"));
      return;
    }
    setSyncState("pending");
    for (const item of items) {
      try {
        const response = await fetch(
          `/api/attempts/${encodeURIComponent(item.attemptId)}/events`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${item.token}`,
            },
            body: JSON.stringify({ events: [item.event] }),
          },
        );
        if (!response.ok && response.status !== 409) break;
        await removeQueuedEvent(item.id);
      } catch {
        break;
      }
    }
    const remaining = await listQueuedEvents();
    setSyncState(remaining.length ? "pending" : "online");
  }, []);

  useEffect(() => {
    const goOnline = () => void flushOfflineQueue();
    const goOffline = () => setSyncState("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const initialSync = window.setTimeout(goOnline, 0);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flushOfflineQueue]);

  const recordEvent = useCallback(
    async (
      eventStage: Stage,
      action: string,
      payload: Record<string, unknown>,
      before: Record<string, unknown>,
      after: Record<string, unknown>,
    ) => {
      const current = sessionRef.current;
      if (!current) return;
      const event = {
        seq: current.nextSeq,
        step: eventStage,
        action,
        payload: {
          ...payload,
          contentVersion: siteContent.contentVersion,
        },
        clientElapsedMs: Date.now() - current.startedAt,
        before,
        after,
      };
      const next = { ...current, nextSeq: current.nextSeq + 1 };
      sessionRef.current = next;
      setSession(next);
      const item = {
        id: `${current.attemptId}:${event.seq}`,
        attemptId: current.attemptId,
        token: current.attemptToken,
        event,
      };
      if (!navigator.onLine) {
        await queueEvent(item);
        setSyncState("offline");
        return;
      }
      try {
        const response = await fetch(
          `/api/attempts/${encodeURIComponent(current.attemptId)}/events`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${current.attemptToken}`,
            },
            body: JSON.stringify({ events: [event] }),
          },
        );
        if (!response.ok) throw new Error("event sync failed");
      } catch {
        await queueEvent(item);
        setSyncState("pending");
      }
    },
    [],
  );

  const captureCurrentStep = useCallback(
    async (step: (typeof practice.steps)[number]): Promise<Capture> => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const element = evidenceRef.current;
      if (!element) throw new Error("找不到證據畫面。");
      const canvas = await html2canvas(element, {
        backgroundColor: "#f7fafc",
        scale: Math.min(window.devicePixelRatio || 1.4, 1.8),
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      return {
        pageNo: step.evidencePage,
        stepId: step.id,
        title: step.title,
        dataUrl,
        checksum: await checksumDataUrl(dataUrl),
      };
    },
    [],
  );

  const buildEvidencePdf = useCallback(
    async (items: Capture[]): Promise<Blob> => {
      const sorted = [...items].sort((a, b) => a.pageNo - b.pageNo);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      for (let index = 0; index < sorted.length; index += 1) {
        if (index > 0) pdf.addPage("a4", "landscape");
        const page = sorted[index];
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = 1400;
        pageCanvas.height = 990;
        const context = pageCanvas.getContext("2d");
        if (!context) throw new Error("無法建立PDF畫布。");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.fillStyle = "#17324d";
        context.fillRect(0, 0, pageCanvas.width, 116);
        context.fillStyle = "#ffffff";
        context.font =
          '700 30px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
        context.fillText(
          `坐火車趣集集｜${page.title}｜第 ${page.pageNo} 頁`,
          46,
          48,
        );
        context.font =
          '500 23px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
        context.fillText(
          `學號 ${studentId}　練習 ${sessionRef.current?.attemptId.slice(-6) ?? ""}　${new Date().toLocaleDateString("zh-TW")}`,
          46,
          87,
        );
        const image = new Image();
        image.src = page.dataUrl;
        await image.decode();
        const maxWidth = 1320;
        const maxHeight = 800;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        context.drawImage(image, (1400 - width) / 2, 140, width, height);
        context.fillStyle = "#6d480c";
        context.font =
          '700 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
        context.fillText(
          "模擬教材，不可作為真實乘車或訂票資訊。",
          46,
          962,
        );
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.84),
          "JPEG",
          0,
          0,
          297,
          210,
        );
      }
      return pdf.output("blob");
    },
    [studentId],
  );

  async function startPractice() {
    if (!/^\d{5}$/.test(studentId)) {
      setFeedback("error");
      setMessage(practice.studentId.error);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          unitId: "unit.train-tickets",
          contentVersion: siteContent.contentVersion,
        }),
      });
      const data = (await response.json()) as {
        attemptId?: string;
        attemptToken?: string;
        nextSeq?: number;
        message?: string;
      };
      if (!response.ok || !data.attemptId || !data.attemptToken) {
        throw new Error(data.message ?? "目前無法開始，請請老師協助。");
      }
      const nextSession = {
        attemptId: data.attemptId,
        attemptToken: data.attemptToken,
        nextSeq: data.nextSeq ?? 2,
        startedAt: Date.now(),
      };
      sessionRef.current = nextSession;
      setSession(nextSession);
      setStage("origin");
      setFeedback(null);
    } catch (error) {
      setFeedback("error");
      setMessage(
        error instanceof Error ? error.message : "目前無法開始，請請老師協助。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseField(
    field: "origin" | "destination" | "date" | "train",
    value: string,
  ) {
    const before = stateSnapshot();
    const nextSelection = { ...selectionRef.current, [field]: value };
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
    await recordEvent(
      stage,
      "field_selected",
      { field, value },
      before,
      stateSnapshot({ [field]: value }),
    );
  }

  async function fail(code: string, text: string, focusId?: string) {
    setFeedback("error");
    setMessage(text);
    await recordEvent(
      stage,
      "validation_failed",
      { errorCode: code },
      stateSnapshot(),
      stateSnapshot(),
    );
    if (focusId) document.getElementById(focusId)?.focus();
  }

  async function passCurrentStep() {
    if (stage === "student_id") return;
    const step = stepByStage[stage];
    setFeedback("correct");
    setMessage(practice.feedback.correctText);
    if (!muted) playTone(stage === "success" ? "complete" : "correct");
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    const capture = await captureCurrentStep(step);
    const nextCaptures = [
      ...captures.filter((item) => item.pageNo !== capture.pageNo),
      capture,
    ].sort((a, b) => a.pageNo - b.pageNo);
    setCaptures(nextCaptures);
    await recordEvent(
      stage,
      "step_passed",
      { stepId: step.id, pageNo: step.evidencePage },
      stateSnapshot(),
      {
        ...stateSnapshot(),
        passedSteps: nextCaptures.map((item) => item.stepId),
      },
    );
    if (stage === "success") {
      await recordEvent(
        "success",
        "attempt_completed",
        { reason: navigator.onLine ? "student_action" : "offline_retry" },
        stateSnapshot(),
        stateSnapshot(),
      );
      const pdfBlob = await buildEvidencePdf(nextCaptures);
      const url = URL.createObjectURL(pdfBlob);
      setFinalPdfUrl(url);
      const current = sessionRef.current;
      if (current && navigator.onLine) {
        const form = new FormData();
        form.append("pdf", pdfBlob, "proof.pdf");
        form.append("checksum", await checksumBlob(pdfBlob));
        form.append("pageCount", "7");
        form.append("contentVersion", siteContent.contentVersion);
        form.append(
          "manifest",
          JSON.stringify(
            nextCaptures.map(({ pageNo, stepId, checksum }) => ({
              pageNo,
              stepId,
              checksum,
            })),
          ),
        );
        try {
          const response = await fetch(
            `/api/attempts/${encodeURIComponent(current.attemptId)}/evidence`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${current.attemptToken}` },
              body: form,
            },
          );
          if (response.ok) setSyncState("received");
          else setSyncState("pending");
        } catch {
          setSyncState("pending");
        }
      } else {
        setSyncState("offline");
      }
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 760));
    const nextStage = stages[stages.indexOf(stage) + 1];
    setFeedback(null);
    setMessage("");
    setStage(nextStage);
  }

  async function validateAndContinue() {
    setBusy(true);
    try {
      switch (stage) {
        case "origin":
          if (selection.origin !== practice.mission.originId) {
            await fail("wrong_origin", "請選擇二水 Ershui 作為起點。", "origin-ershui");
            return;
          }
          break;
        case "destination":
          if (selection.destination === selection.origin) {
            await fail(
              "same_station",
              practice.feedback.errorSameStation,
              "destination-checheng",
            );
            return;
          }
          if (selection.destination !== practice.mission.destinationId) {
            await fail(
              "wrong_destination",
              "再看任務卡：這次要前往車埕 Checheng。",
              "destination-checheng",
            );
            return;
          }
          break;
        case "date":
          if (selection.date !== practice.mission.dateId) {
            await fail("wrong_date", practice.feedback.errorDate, "date-practice-day-2");
            return;
          }
          break;
        case "search":
          if (
            selection.origin === "station.checheng" &&
            selection.destination === "station.ershui"
          ) {
            await fail("reversed_route", practice.feedback.errorReversed, "swap-route");
            return;
          }
          if (
            selection.origin !== practice.mission.originId ||
            selection.destination !== practice.mission.destinationId ||
            selection.date !== practice.mission.dateId
          ) {
            await fail("incomplete_search", "請先檢查起點、目的地與模擬日期。");
            return;
          }
          break;
        case "train":
          if (selection.train !== practice.mission.trainId) {
            await fail("wrong_train", practice.feedback.errorTrain, "train-sample-b");
            return;
          }
          break;
        case "summary":
          if (selection.summaryChecks.length !== 6) {
            await fail(
              "incomplete_summary",
              "還有欄位沒有核對，請完成六個勾選。",
            );
            return;
          }
          break;
        case "success":
          break;
        default:
          return;
      }
      await passCurrentStep();
    } finally {
      setBusy(false);
    }
  }

  async function swapRoute() {
    const before = stateSnapshot();
    const next = {
      ...selectionRef.current,
      origin: selectionRef.current.destination,
      destination: selectionRef.current.origin,
    };
    selectionRef.current = next;
    setSelection(next);
    await recordEvent(
      "search",
      "swap",
      { reason: "student_action" },
      before,
      stateSnapshot({ origin: next.origin, destination: next.destination }),
    );
  }

  function toggleSummary(id: string) {
    const checked = selection.summaryChecks.includes(id);
    const summaryChecks = checked
      ? selection.summaryChecks.filter((item) => item !== id)
      : [...selection.summaryChecks, id];
    const next = { ...selectionRef.current, summaryChecks };
    selectionRef.current = next;
    setSelection(next);
    void recordEvent(
      "summary",
      "field_selected",
      { field: id, value: !checked },
      stateSnapshot(),
      stateSnapshot({ summaryChecks }),
    );
  }

  const selectedTrain = useMemo(() => trainInfo(selection.train), [selection.train]);
  const progressText =
    stage === "student_id"
      ? "輸入學號後開始"
      : `第 ${currentStepIndex}／7 步`;

  return (
    <div className="ticket-page">
      <div className="ticket-topline">
        <Link href="/" className="breadcrumb">
          ← 回到單元首頁
        </Link>
        <div className={`sync-chip sync-chip--${syncState}`} role="status">
          {syncState === "offline" && "● 離線練習，尚未同步"}
          {syncState === "pending" && "● 等待同步"}
          {syncState === "received" && "✓ 教師已收到"}
          {syncState === "online" && "● 線上"}
        </div>
      </div>

      <div className="ticket-heading">
        <div>
          <span className="eyebrow">BUY TRAIN TICKETS ONLINE</span>
          <h1>火車線上購票網站</h1>
          <p>讀任務、找資料、逐步核對，完成你的 SAMPLE 車票。</p>
        </div>
        <button
          type="button"
          className="sound-button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
        >
          {muted ? "🔇 開啟音效" : "🔊 關閉音效"}
        </button>
      </div>

      <div className="simulation-alert" role="note">
        <strong>教學提醒</strong>
        <span>{siteContent.site.simulationNotice}</span>
      </div>

      <div className="progress-track" aria-label={progressText}>
        <div>
          <strong>{progressText}</strong>
          <span>{stage === "student_id" ? "READY" : stepByStage[stage].title}</span>
        </div>
        <ol>
          {stages.map((item, index) => (
            <li
              key={item}
              className={
                index + 1 < currentStepIndex
                  ? "is-done"
                  : index + 1 === currentStepIndex
                    ? "is-current"
                    : ""
              }
            >
              <span>{index + 1}</span>
            </li>
          ))}
        </ol>
      </div>

      <section
        className={`practice-card ${feedback ? `practice-card--${feedback}` : ""}`}
        ref={evidenceRef}
        data-evidence-region
      >
        {feedback === "correct" && (
          <div className="celebration" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
        )}
        <div className="practice-card__visual" aria-hidden="true">
          <div className="mini-route">
            <span className="mini-station is-start">二水</span>
            <i />
            <span className={stage !== "origin" ? "mini-station" : "mini-station is-muted"}>
              集集
            </span>
            <i />
            <span className={stage !== "origin" ? "mini-station" : "mini-station is-muted"}>
              水里
            </span>
            <i />
            <span className={stage !== "origin" ? "mini-station is-end" : "mini-station is-muted"}>
              車埕
            </span>
          </div>
          <span className="moving-train">🚂</span>
        </div>

        {stage === "student_id" && (
          <div className="student-start">
            <span className="step-kicker">READY TO GO?</span>
            <h2>輸入學號，領取練習任務</h2>
            <p>{siteContent.site.privacyNotice}</p>
            <label htmlFor="student-id">學生學號 Student ID</label>
            <input
              id="student-id"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              placeholder={practice.studentId.placeholder}
              value={studentId}
              onChange={(event) =>
                setStudentId(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
              aria-describedby="student-help"
            />
            <small id="student-help">範例：40100，只輸入五位數字。</small>
            {feedback === "error" && (
              <div
                className="feedback-box feedback-box--error"
                role="alert"
                aria-live="assertive"
              >
                <span>!</span>
                <strong>{practice.feedback.errorHeading}</strong>
                <em>{message}</em>
              </div>
            )}
            <button
              type="button"
              className="primary-action"
              disabled={busy}
              onClick={() => void startPractice()}
            >
              {busy ? "建立任務中…" : practice.startButton}
            </button>
          </div>
        )}

        {stage !== "student_id" && (
          <div className="step-layout">
            <aside className="mission-card">
              <span>MISSION 任務卡</span>
              <p>{practice.mission.instruction}</p>
              <div className="pair-roles">
                <strong>Operator</strong> 操作 iPad
                <strong>Checker</strong> 說：
                <em>{practice.roles.checkerPrompt}</em>
              </div>
            </aside>

            <div className="step-main">
              <span className="step-kicker">STEP {currentStepIndex}</span>
              <h2>{stepByStage[stage].title}</h2>
              <p className="step-instruction">{stepByStage[stage].instruction}</p>

              {stage === "origin" && (
                <div className="choice-grid choice-grid--one">
                  <button
                    id="origin-ershui"
                    type="button"
                    className={selection.origin === "station.ershui" ? "choice is-selected" : "choice"}
                    onClick={() => void chooseField("origin", "station.ershui")}
                  >
                    <span className="choice-icon">🚉</span>
                    <strong>二水</strong>
                    <small>Ershui</small>
                    <em>集集線的出發點</em>
                  </button>
                </div>
              )}

              {stage === "destination" && (
                <div className="choice-grid">
                  {practice.stations
                    .filter((station) => station.role === "destination")
                    .map((station) => (
                      <button
                        id={`destination-${station.id.replace("station.", "")}`}
                        type="button"
                        key={station.id}
                        className={selection.destination === station.id ? "choice is-selected" : "choice"}
                        onClick={() => void chooseField("destination", station.id)}
                      >
                        <span className="choice-icon">
                          {station.id === "station.jiji"
                            ? "🌿"
                            : station.id === "station.shuili"
                              ? "💧"
                              : "🪵"}
                        </span>
                        <strong>{station.zh}</strong>
                        <small>{station.en}</small>
                      </button>
                    ))}
                </div>
              )}

              {stage === "date" && (
                <div className="choice-grid">
                  {practice.dates.map((date, index) => (
                    <button
                      id={`date-${date.id.replace("date.", "")}`}
                      type="button"
                      key={date.id}
                      className={selection.date === date.id ? "choice date-choice is-selected" : "choice date-choice"}
                      onClick={() => void chooseField("date", date.id)}
                    >
                      <span className="calendar-top">SAMPLE</span>
                      <strong>{date.label}</strong>
                      <small>模擬資料 {index + 1}</small>
                    </button>
                  ))}
                </div>
              )}

              {stage === "search" && (
                <div className="search-review">
                  <div className="route-review">
                    <div>
                      <small>FROM 起點</small>
                      <strong>{stationName(selection.origin)}</strong>
                    </div>
                    <button id="swap-route" type="button" onClick={() => void swapRoute()}>
                      ⇄<span>交換</span>
                    </button>
                    <div>
                      <small>TO 目的地</small>
                      <strong>{stationName(selection.destination)}</strong>
                    </div>
                  </div>
                  <div className="date-review">
                    <small>DATE 日期</small>
                    <strong>{dateName(selection.date)}</strong>
                    <span>SAMPLE 模擬日期</span>
                  </div>
                </div>
              )}

              {stage === "train" && (
                <div className="train-grid">
                  {practice.trains.map((train) => (
                    <button
                      id={`train-${train.id.replace("train.", "")}`}
                      type="button"
                      key={train.id}
                      className={selection.train === train.id ? "train-choice is-selected" : "train-choice"}
                      onClick={() => void chooseField("train", train.id)}
                    >
                      <span>SAMPLE</span>
                      <strong>{train.label}</strong>
                      <div>
                        <b>{train.depart}</b>
                        <i>→</i>
                        <b>{train.arrive}</b>
                      </div>
                      <small>約 {train.durationMinutes} 分鐘</small>
                    </button>
                  ))}
                </div>
              )}

              {stage === "summary" && (
                <div className="summary-card">
                  <div className="summary-route">
                    <span>{stationName(selection.origin)}</span>
                    <i>→</i>
                    <span>{stationName(selection.destination)}</span>
                  </div>
                  <div className="summary-grid">
                    {practice.summaryFields.map((field) => {
                      const value =
                        field.id === "summary.from"
                          ? stationName(selection.origin)
                          : field.id === "summary.to"
                            ? stationName(selection.destination)
                            : field.id === "summary.date"
                              ? dateName(selection.date)
                              : field.id === "summary.train"
                                ? selectedTrain?.label
                                : field.id === "summary.depart"
                                  ? selectedTrain?.depart
                                  : selectedTrain?.arrive;
                      return (
                        <label key={field.id}>
                          <input
                            type="checkbox"
                            checked={selection.summaryChecks.includes(field.id)}
                            onChange={() => toggleSummary(field.id)}
                          />
                          <span>
                            <small>{field.labelEn}</small>
                            <strong>{field.labelZh}</strong>
                            <em>{value}</em>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {stage === "success" && (
                <div className="sample-ticket">
                  <div className="sample-ticket__top">
                    <span>{practice.sampleTicket.badge}</span>
                    <strong>練習完成票</strong>
                  </div>
                  <div className="sample-ticket__route">
                    <div>
                      <small>FROM</small>
                      <strong>二水</strong>
                      <span>Ershui</span>
                    </div>
                    <i>🚂</i>
                    <div>
                      <small>TO</small>
                      <strong>車埕</strong>
                      <span>Checheng</span>
                    </div>
                  </div>
                  <div className="sample-ticket__info">
                    <span>模擬日期2</span>
                    <span>模擬車次B</span>
                    <span>09:40 → 10:35</span>
                  </div>
                  <p>{practice.sampleTicket.notice}</p>
                </div>
              )}

              <div
                className={`feedback-box ${feedback ? `feedback-box--${feedback}` : ""}`}
                aria-live="polite"
                role="status"
              >
                {feedback === "correct" && (
                  <>
                    <span>✓</span>
                    <strong>{practice.feedback.correctText}</strong>
                    <em>這一步完成了！</em>
                  </>
                )}
                {feedback === "error" && (
                  <>
                    <span>!</span>
                    <strong>{practice.feedback.errorHeading}</strong>
                    <em>{message}</em>
                  </>
                )}
              </div>

              <button
                type="button"
                className="primary-action"
                disabled={busy}
                onClick={() => void validateAndContinue()}
              >
                {busy
                  ? "正在記錄…"
                  : stage === "success"
                    ? "完成並建立七頁PDF"
                    : stage === "search"
                      ? "Search／查詢"
                      : "Check／完成這一步"}
              </button>

              {stage === "success" && finalPdfUrl && (
                <a className="download-proof" href={finalPdfUrl} download="practice-proof.pdf">
                  下載我的七頁練習紀錄 PDF
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
