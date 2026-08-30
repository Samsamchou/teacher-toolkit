import { addDays, parseISO } from "date-fns";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CLASSES, SEMESTER, SUBJECTS } from "../data/semester";
import {
  activeHolidayForDate,
  assignmentsForClassWindow,
  createId,
  currentOutcome,
  dateKey,
  latestSubmissionBySeat,
  recentActualClassDates,
} from "../domain/logic";
import { useAppData } from "../state/AppDataContext";
import {
  CLASS_IDS,
  type ClassId,
  type MissingReason,
  type SubmissionEvent,
  type SubmissionOutcome,
} from "../types";
import { ClassBadge, EmptyState, InlineNotice, PageHeading, Panel, SubjectBadge } from "./Common";
import { formatSchoolDate, HOMEWORK_LABELS, OUTCOME_LABELS, REASON_LABELS } from "./labels";

export function SubmissionPage({ onGoSchedule }: { onGoSchedule(): void }) {
  const { snapshot, addSubmissionEvents } = useAppData();
  const [classId, setClassId] = useState<ClassId>("六甲");
  const [selectedDate, setSelectedDate] = useState(SEMESTER.startDate);
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [selectedSeat, setSelectedSeat] = useState<number>(CLASSES.六甲.seats[0]);
  const [outcome, setOutcome] = useState<SubmissionOutcome>("submitted");
  const [reason, setReason] = useState<MissingReason>("excused-absence");
  const [occurredOn, setOccurredOn] = useState(SEMESTER.startDate);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dateWindow = useMemo(
    () => recentActualClassDates(classId, selectedDate, snapshot.timetableExceptions),
    [classId, selectedDate, snapshot.timetableExceptions],
  );
  const selectedHoliday = activeHolidayForDate(
    selectedDate,
    snapshot.timetableExceptions,
  );
  const assignmentWindow = useMemo(
    () =>
      assignmentsForClassWindow(
        classId,
        selectedDate,
        snapshot.assignments,
        snapshot.submissionEvents,
        snapshot.timetableExceptions,
      ),
    [classId, selectedDate, snapshot.assignments, snapshot.submissionEvents, snapshot.timetableExceptions],
  );
  const visibleAssignments = [...assignmentWindow.recent, ...assignmentWindow.olderOutstanding];
  const activeAssignment = visibleAssignments.find((item) => item.id === assignmentId) ?? visibleAssignments[0];
  const latest = useMemo(
    () => activeAssignment ? latestSubmissionBySeat(activeAssignment.id, snapshot.submissionEvents) : new Map<number, SubmissionEvent>(),
    [activeAssignment?.id, snapshot.submissionEvents],
  );
  const seats = CLASSES[classId].seats;
  const firstLaterDate = activeAssignment
    ? dateKey(addDays(parseISO(activeAssignment.assignedDate), 1))
    : SEMESTER.startDate;

  useEffect(() => {
    setAssignmentId(visibleAssignments[0]?.id ?? "");
  }, [classId, selectedDate]);

  useEffect(() => {
    setSelectedSeat(CLASSES[classId].seats[0]);
  }, [classId]);

  useEffect(() => {
    const event = latest.get(selectedSeat);
    setOutcome(event?.outcome ?? "submitted");
    setReason(event?.reason ?? "excused-absence");
    setOccurredOn(event?.occurredOn ?? selectedDate);
    setNote(event?.note ?? "");
  }, [activeAssignment?.id, latest, selectedDate, selectedSeat]);

  const statusCounts = useMemo(() => {
    const counts: Record<SubmissionOutcome, number> = {
      submitted: 0,
      "still-missing": 0,
      "same-day-completed": 0,
      "later-submitted": 0,
    };
    if (!activeAssignment) return counts;
    seats.forEach((seat) => counts[currentOutcome(activeAssignment.id, seat, snapshot.submissionEvents)] += 1);
    return counts;
  }, [activeAssignment, seats, snapshot.submissionEvents]);

  const chooseSeat = (seat: number) => {
    setSelectedSeat(seat);
    setMessage("");
    setError("");
  };

  const saveSeat = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeAssignment) return;
    if (outcome === "still-missing" && !reason) {
      setError("請選擇未交原因。");
      return;
    }
    if (outcome === "later-submitted" && occurredOn <= activeAssignment.assignedDate) {
      setError("日後補交日期必須晚於作業日期；同日請選「當天完成後繳交」。");
      return;
    }
    const effectiveDate =
      outcome === "same-day-completed" ? activeAssignment.assignedDate : occurredOn;
    try {
      setSaving(true);
      setError("");
      await addSubmissionEvents([
        {
          id: createId("submission"),
          assignmentId: activeAssignment.id,
          classId,
          seatNumber: selectedSeat,
          outcome,
          reason: outcome === "submitted" ? undefined : reason,
          note: note.trim() || undefined,
          occurredOn: effectiveDate,
          recordedAt: new Date().toISOString(),
        },
      ]);
      setMessage(`${classId} ${selectedSeat} 號已更新為「${OUTCOME_LABELS[outcome]}」。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "繳交狀態儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  const markAllSubmitted = async () => {
    if (!activeAssignment) return;
    if (
      latest.size > 0 &&
      !window.confirm(
        `這份作業已有 ${latest.size} 個座號的登記歷程。繼續會把全班目前狀態更新為「已繳交」，但舊歷程仍會保留。是否繼續？`,
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      const now = new Date().toISOString();
      await addSubmissionEvents(
        seats.map((seat) => ({
          id: createId("submission"),
          assignmentId: activeAssignment.id,
          classId,
          seatNumber: seat,
          outcome: "submitted" as const,
          occurredOn: selectedDate,
          recordedAt: now,
        })),
      );
      setMessage(`已將 ${classId} 全班 ${seats.length} 人標記為已繳交；仍可逐號修正。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "全班狀態儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="02・逐號掌握"
        title="作業繳交"
        description="先選班級與查詢日期，再從前 5 個實際上課日的作業或跨週待補清單中登記。"
      />

      <Panel className="filter-panel">
        <label className="field">
          <span>班級</span>
          <select value={classId} onChange={(event) => setClassId(event.target.value as ClassId)}>
            {CLASS_IDS.map((id) => <option key={id} value={id}>{CLASSES[id].label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>查詢到哪一天</span>
          <input type="date" min={SEMESTER.startDate} max={SEMESTER.endDate} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <div className="actual-date-window">
          <span>前 5 個實際上課日</span>
          <div>
            {dateWindow.length ? dateWindow.map((date) => <span key={date}>{formatSchoolDate(date)}</span>) : <small>所選日期前尚無此班課程</small>}
          </div>
        </div>
      </Panel>

      {selectedHoliday ? (
        <InlineNotice title={`國定假日・${selectedHoliday.holidayName}`}>
          當天沒有上課，因此不會列入前 5 個實際上課日；仍可在這裡如實登記線上或其他方式收到的補交作業。
        </InlineNotice>
      ) : null}

      {!visibleAssignments.length ? (
        <Panel>
          <EmptyState icon="□" title="找不到可登記的作業">
            這 5 個實際上課日尚未出作業，也沒有較舊的未結案作業。
          </EmptyState>
          <div className="center-actions"><button className="button button--primary" type="button" onClick={onGoSchedule}>前往課表新增作業</button></div>
        </Panel>
      ) : (
        <div className="submission-layout">
          <Panel className="assignment-list-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">選擇作業</p><h3>{CLASSES[classId].label}</h3></div>
              <span className="count-bubble">{visibleAssignments.length}</span>
            </div>

            <div className="assignment-group">
              <h4>近 5 個上課日</h4>
              {assignmentWindow.recent.length ? assignmentWindow.recent.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  className={activeAssignment?.id === assignment.id ? "assignment-choice is-active" : "assignment-choice"}
                  onClick={() => setAssignmentId(assignment.id)}
                >
                  <span><strong>{formatSchoolDate(assignment.assignedDate)}</strong><small>第 {assignment.period} 節</small></span>
                  <span><SubjectBadge subjectId={assignment.subjectId} /><small>{HOMEWORK_LABELS[assignment.homeworkType]}</small></span>
                  <b>{assignment.content}</b>
                </button>
              )) : <p className="muted-copy">這 5 個上課日尚無作業。</p>}
            </div>

            {assignmentWindow.olderOutstanding.length ? (
              <div className="assignment-group assignment-group--alert">
                <h4><span aria-hidden="true">!</span> 跨週仍待補交</h4>
                {assignmentWindow.olderOutstanding.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    className={activeAssignment?.id === assignment.id ? "assignment-choice is-active" : "assignment-choice"}
                    onClick={() => setAssignmentId(assignment.id)}
                  >
                    <span><strong>{formatSchoolDate(assignment.assignedDate)}</strong><small>第 {assignment.period} 節</small></span>
                    <span><SubjectBadge subjectId={assignment.subjectId} /><small>{HOMEWORK_LABELS[assignment.homeworkType]}</small></span>
                    <b>{assignment.content}</b>
                  </button>
                ))}
              </div>
            ) : null}
          </Panel>

          <div className="submission-workspace">
            <Panel>
              <div className="submission-titlebar">
                <div>
                  <div className="assignment-context"><ClassBadge classId={classId} />{activeAssignment ? <SubjectBadge subjectId={activeAssignment.subjectId} /> : null}</div>
                  <h3>{activeAssignment?.content}</h3>
                  <p>{activeAssignment ? `${formatSchoolDate(activeAssignment.assignedDate)}・第 ${activeAssignment.period} 節・${HOMEWORK_LABELS[activeAssignment.homeworkType]}` : ""}</p>
                </div>
                <button className="button button--success" type="button" disabled={saving} onClick={() => void markAllSubmitted()}>
                  ✓ 一鍵全班已交
                </button>
              </div>

              <InlineNotice title="登記方式">
                系統預設每位學生為「已繳交」。先按「一鍵全班已交」，再點選例外座號設定未交原因或補交結果；每次修改都會保留歷程。
              </InlineNotice>

              <div className="submission-stats" aria-label="繳交統計">
                <span><strong>{seats.length - statusCounts["still-missing"]}</strong><small>目前已完成</small></span>
                <span className="is-danger"><strong>{statusCounts["still-missing"]}</strong><small>仍未交</small></span>
                <span><strong>{statusCounts["same-day-completed"]}</strong><small>當天完成</small></span>
                <span><strong>{statusCounts["later-submitted"]}</strong><small>日後補交</small></span>
              </div>

              <div className="seat-grid" aria-label={`${classId}座號表`}>
                {seats.map((seat) => {
                  const seatOutcome = activeAssignment ? currentOutcome(activeAssignment.id, seat, snapshot.submissionEvents) : "submitted";
                  return (
                    <button
                      key={seat}
                      type="button"
                      className={`seat-button seat-button--${seatOutcome} ${selectedSeat === seat ? "is-selected" : ""}`}
                      onClick={() => chooseSeat(seat)}
                      aria-pressed={selectedSeat === seat}
                      aria-label={`${seat} 號，${OUTCOME_LABELS[seatOutcome]}`}
                    >
                      <strong>{seat}</strong><small>號</small><span aria-hidden="true">{seatOutcome === "still-missing" ? "!" : seatOutcome === "submitted" ? "✓" : "↻"}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel className="seat-editor-panel">
              <form onSubmit={saveSeat}>
                <div className="seat-editor-heading">
                  <span className="selected-seat-number">{selectedSeat}</span>
                  <div><p className="eyebrow">目前編輯</p><h3>{classId}・{selectedSeat} 號</h3></div>
                </div>
                <fieldset className="choice-fieldset">
                  <legend>繳交結果</legend>
                  <div className="choice-cards">
                    {(Object.entries(OUTCOME_LABELS) as Array<[SubmissionOutcome, string]>).map(([value, label]) => (
                      <label key={value} className={outcome === value ? "is-checked" : ""}>
                        <input
                          type="radio"
                          name="outcome"
                          value={value}
                          checked={outcome === value}
                          onChange={() => {
                            setOutcome(value);
                            if (value === "same-day-completed" && activeAssignment) {
                              setOccurredOn(activeAssignment.assignedDate);
                            } else if (
                              value === "later-submitted" &&
                              activeAssignment &&
                              occurredOn < firstLaterDate
                            ) {
                              setOccurredOn(firstLaterDate);
                            }
                          }}
                        />
                        <span aria-hidden="true">{value === "submitted" ? "✓" : value === "still-missing" ? "!" : value === "same-day-completed" ? "⌁" : "↻"}</span>
                        <strong>{label}</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {outcome !== "submitted" ? (
                  <div className="form-grid form-grid--two">
                    <label className="field">
                      <span>原未交原因{outcome === "still-missing" ? "（必填）" : ""}</span>
                      <select value={reason} onChange={(event) => setReason(event.target.value as MissingReason)}>
                        {Object.entries(REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    {outcome === "same-day-completed" ? (
                      <div className="field readonly-field">
                        <span>完成日期</span>
                        <strong>{activeAssignment?.assignedDate}（作業當天）</strong>
                      </div>
                    ) : (
                      <label className="field">
                        <span>{outcome === "later-submitted" ? "實際補交日期" : "狀態日期"}</span>
                        <input
                          type="date"
                          min={outcome === "later-submitted" ? firstLaterDate : activeAssignment?.assignedDate ?? SEMESTER.startDate}
                          value={occurredOn}
                          onChange={(event) => setOccurredOn(event.target.value)}
                        />
                      </label>
                    )}
                  </div>
                ) : null}

                <label className="field">
                  <span>備註（選填）</span>
                  <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="請勿填寫姓名、家庭或輔導敏感資料" />
                </label>
                {message ? <p className="form-success" role="status">{message}</p> : null}
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <div className="form-actions"><button className="button button--primary" type="submit" disabled={saving}>{saving ? "儲存中…" : `儲存 ${selectedSeat} 號狀態`}</button></div>
              </form>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
