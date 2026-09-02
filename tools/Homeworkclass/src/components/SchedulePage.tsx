import { addDays, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { CLASSES, PERIODS, SEMESTER, SUBJECTS } from "../data/semester";
import {
  activeAssignments,
  activeHolidayForDate,
  createId,
  dateKey,
  holidayConflictsForDate,
  scheduleForDate,
  weekDates,
  weekStartKey,
} from "../domain/logic";
import { useAppData } from "../state/AppDataContext";
import type { Assignment, HomeworkType, ScheduleSlot } from "../types";
import { ClassBadge, EmptyState, Modal, PageHeading, Panel, SubjectBadge } from "./Common";
import { formatSchoolDate, HOMEWORK_LABELS, WEEKDAY_LABELS } from "./labels";

type DatedSlot = ScheduleSlot & { date: string };

const currentOrFirstWeek = () => {
  const today = dateKey(new Date());
  const date = today >= SEMESTER.startDate && today <= SEMESTER.endDate ? today : SEMESTER.startDate;
  return weekStartKey(date);
};

function AssignmentDialog({ slot, onClose }: { slot: DatedSlot; onClose(): void }) {
  const { addAssignment } = useAppData();
  const [homeworkType, setHomeworkType] = useState<HomeworkType>("textbook");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) {
      setError("請輸入作業內容。");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await addAssignment({
        id: createId("assignment"),
        classId: slot.classId,
        subjectId: slot.subjectId,
        assignedDate: slot.date,
        period: slot.period,
        homeworkType,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "作業儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新增本節作業"
      description={`${formatSchoolDate(slot.date)}・第 ${slot.period} 節`}
      onClose={onClose}
      labelledBy="assignment-dialog-title"
    >
      <form className="stack-form" onSubmit={submit}>
        <div className="assignment-context">
          <ClassBadge classId={slot.classId} />
          <SubjectBadge subjectId={slot.subjectId} />
          <span>{slot.startTime}–{slot.endTime}</span>
        </div>

        <label className="field">
          <span>作業類型</span>
          <select value={homeworkType} onChange={(event) => setHomeworkType(event.target.value as HomeworkType)}>
            {Object.entries(HOMEWORK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>作業內容</span>
          <textarea
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="例如：課本第 12–13 頁，單字抄寫 2 次"
            autoFocus
          />
          <small>請寫清楚頁碼、題號或完成方式。</small>
        </label>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions">
          <button className="button button--ghost" type="button" onClick={onClose}>取消</button>
          <button className="button button--primary" type="submit" disabled={saving}>{saving ? "儲存中…" : "儲存作業"}</button>
        </div>
      </form>
    </Modal>
  );
}

export function SchedulePage() {
  const { snapshot, deleteAssignment } = useAppData();
  const [weekStart, setWeekStart] = useState(currentOrFirstWeek);
  const [activeSlot, setActiveSlot] = useState<DatedSlot | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const dates = weekDates(weekStart);
  const lastWeek = weekStartKey(SEMESTER.endDate);

  const scheduleByDate = useMemo(
    () =>
      Object.fromEntries(
        dates.map((date) => [date, scheduleForDate(date, snapshot.timetableExceptions)]),
      ),
    [dates.join("|"), snapshot.timetableExceptions],
  );
  const holidayByDate = useMemo(
    () =>
      Object.fromEntries(
        dates.map((date) => [
          date,
          activeHolidayForDate(date, snapshot.timetableExceptions),
        ]),
      ),
    [dates.join("|"), snapshot.timetableExceptions],
  );
  const weekLessonCount = Object.values(scheduleByDate).reduce((sum, slots) => sum + slots.length, 0);
  const weekAssignments = activeAssignments(snapshot)
    .filter((item) => dates.includes(item.assignedDate))
    .sort((a, b) => `${b.assignedDate}-${b.period}`.localeCompare(`${a.assignedDate}-${a.period}`));

  const moveWeek = (difference: number) => {
    const next = weekStartKey(dateKey(addDays(parseISO(weekStart), difference * 7)));
    if (next >= weekStartKey(SEMESTER.startDate) && next <= lastWeek) setWeekStart(next);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      setDeleting(true);
      setDeleteError("");
      const result = await deleteAssignment(assignmentToDelete.id);
      setDeleteMessage(
        result.status === "already-deleted"
          ? "這項作業已經刪除。"
          : "作業已刪除；原作業保留為作廢紀錄。",
      );
      setAssignmentToDelete(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "作業刪除失敗。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="01・以課表開始"
        title="本週課表"
        description="點選任一課程，日期、節次、班級與科目會自動帶入作業表單。"
        actions={
          <div className="week-switcher" aria-label="切換週次">
            <button type="button" onClick={() => moveWeek(-1)} disabled={weekStart <= weekStartKey(SEMESTER.startDate)} aria-label="上一週">‹</button>
            <label>
              <span className="sr-only">選擇週一日期</span>
              <input
                type="date"
                min={SEMESTER.startDate}
                max={SEMESTER.endDate}
                value={weekStart}
                onChange={(event) => setWeekStart(weekStartKey(event.target.value))}
              />
            </label>
            <button type="button" onClick={() => moveWeek(1)} disabled={weekStart >= lastWeek} aria-label="下一週">›</button>
          </div>
        }
      />

      <div className="schedule-summary-row">
        <div><span aria-hidden="true">▦</span><strong>{formatSchoolDate(dates[0])}–{formatSchoolDate(dates[4])}</strong><small>本週共 {weekLessonCount} 節課</small></div>
        <div className="schedule-legend" aria-label="科目圖例">
          <SubjectBadge subjectId="english" />
          <SubjectBadge subjectId="local" />
          <SubjectBadge subjectId="international-song" />
        </div>
      </div>

      <div className="schedule-layout">
        <Panel className="schedule-panel">
          <div className="schedule-scroll" role="region" aria-label="週課表，可水平捲動" tabIndex={0}>
            <table className="schedule-table">
              <thead>
                <tr>
                  <th scope="col">節次</th>
                  {dates.map((date, index) => (
                    <th scope="col" className={holidayByDate[date] ? "is-holiday" : ""} key={date}>
                      <span>{WEEKDAY_LABELS[index]}</span>
                      <strong>{formatSchoolDate(date).split("（")[0]}</strong>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period.period}>
                    <th scope="row">
                      <strong>{period.period}</strong>
                      <small>{period.startTime}<br />{period.endTime}</small>
                    </th>
                    {dates.map((date) => {
                      const holiday = holidayByDate[date];
                      if (holiday && period.period !== PERIODS[0].period) return null;
                      if (holiday) {
                        const conflicts = holidayConflictsForDate(date, snapshot);
                        return (
                          <td className="holiday-day-cell" rowSpan={PERIODS.length} key={`${date}-holiday`}>
                            <div className="holiday-day-banner">
                              <span aria-hidden="true">✦</span>
                              <small>國定假日</small>
                              <strong>{holiday.holidayName}</strong>
                              <p>全天沒有上課</p>
                              {conflicts.total ? <em>資料衝突待確認・{conflicts.total} 筆</em> : null}
                            </div>
                          </td>
                        );
                      }
                      const slots = scheduleByDate[date].filter((slot) => slot.period === period.period);
                      return (
                        <td key={`${date}-${period.period}`}>
                          {slots.length ? (
                            <div className="slot-stack">
                              {slots.map((slot) => {
                                const classMeta = CLASSES[slot.classId];
                                const hasAssignment = weekAssignments.some(
                                  (assignment) =>
                                    assignment.assignedDate === date &&
                                    assignment.period === slot.period &&
                                    assignment.classId === slot.classId &&
                                    assignment.subjectId === slot.subjectId,
                                );
                                return (
                                  <button
                                    type="button"
                                    className={`lesson-slot lesson-slot--${slot.subjectId}`}
                                    style={{
                                      "--class-accent": classMeta.accent,
                                      "--class-soft": classMeta.accentSoft,
                                      "--class-ink": classMeta.ink,
                                    } as CSSProperties}
                                    key={`${slot.id}-${date}`}
                                    onClick={() => setActiveSlot({ ...slot, date } as DatedSlot)}
                                    aria-label={`${date} 第 ${period.period} 節 ${slot.classId} ${SUBJECTS[slot.subjectId].label}，新增作業`}
                                  >
                                    <span className="lesson-slot__subject">{SUBJECTS[slot.subjectId].shortLabel}</span>
                                    <span><strong>{slot.classId}</strong><small>{SUBJECTS[slot.subjectId].label}</small></span>
                                    <span className="lesson-slot__action" aria-hidden="true">{hasAssignment ? "✓" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="no-lesson" aria-label="無課程">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="week-homework-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">本週紀錄</p><h3>已出的作業</h3></div>
            <span className="count-bubble">{weekAssignments.length}</span>
          </div>
          {deleteMessage ? <p className="form-success" role="status">{deleteMessage}</p> : null}
          {weekAssignments.length ? (
            <ol className="homework-timeline">
              {weekAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <span className="homework-timeline__line" aria-hidden="true" />
                  <div className="homework-timeline__content">
                    <div className="record-card-heading">
                      <span>{formatSchoolDate(assignment.assignedDate)}・第 {assignment.period} 節</span>
                      <button
                        className="record-delete-button"
                        type="button"
                        onClick={() => {
                          setAssignmentToDelete(assignment);
                          setDeleteError("");
                        }}
                        aria-label={`刪除 ${assignment.classId} ${assignment.content}`}
                        title="刪除作業"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                    <div><ClassBadge classId={assignment.classId} /><SubjectBadge subjectId={assignment.subjectId} /></div>
                    <strong>{HOMEWORK_LABELS[assignment.homeworkType]}・{assignment.content}</strong>
                    {activeHolidayForDate(assignment.assignedDate, snapshot.timetableExceptions) ? <em className="conflict-badge">資料衝突待確認・假日當天作業</em> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon="＋" title="本週還沒有作業">點課表中的彩色課程卡，即可新增第一筆作業。</EmptyState>
          )}
        </Panel>
      </div>

      {activeSlot ? <AssignmentDialog slot={activeSlot} onClose={() => setActiveSlot(null)} /> : null}
      {assignmentToDelete ? (
        <Modal
          title="刪除這項作業？"
          description={`${formatSchoolDate(assignmentToDelete.assignedDate)}・${assignmentToDelete.classId}・第 ${assignmentToDelete.period} 節`}
          onClose={() => {
            if (!deleting) setAssignmentToDelete(null);
          }}
          labelledBy="delete-assignment-dialog-title"
        >
          <div className="destructive-confirmation">
            <strong>{HOMEWORK_LABELS[assignmentToDelete.homeworkType]}・{assignmentToDelete.content}</strong>
            <p>原作業會保留為作廢紀錄；相關繳交歷程將移入教師回收區，30 天後永久清除且無法還原。</p>
            {deleteError ? <p className="form-error" role="alert">{deleteError}</p> : null}
            <div className="modal-actions">
              <button className="button button--ghost" type="button" disabled={deleting} onClick={() => setAssignmentToDelete(null)}>取消</button>
              <button className="button button--danger" type="button" disabled={deleting} onClick={() => void confirmDeleteAssignment()}>{deleting ? "刪除中…" : "確認刪除"}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
