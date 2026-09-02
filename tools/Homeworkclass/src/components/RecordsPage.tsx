import { addDays, parseISO } from "date-fns";
import { useMemo, useRef, useState } from "react";
import { CLASSES, SEMESTER, SUBJECTS, WEEKLY_SCHEDULE } from "../data/semester";
import {
  activeAssignments,
  activeHolidayForDate,
  dateKey,
  holidayConflictsForDate,
  latestSubmissionBySeat,
  latestSubmissionBySeatAsOf,
  revocationForHoliday,
  weekStartKey,
} from "../domain/logic";
import {
  downloadCsvReport,
  downloadJsonBackup,
  downloadXlsxReport,
  type ReportExport,
} from "../services/export";
import { useAppData } from "../state/AppDataContext";
import {
  CLASS_IDS,
  SUBJECT_IDS,
  type AppSnapshot,
  type ClassId,
  type DeletedIncidentRecord,
  type DeletedSubmissionRecord,
  type SubjectId,
  type TimetableException,
} from "../types";
import { ClassBadge, EmptyState, InlineNotice, PageHeading, Panel, StatCard, SubjectBadge } from "./Common";
import {
  formatDateTime,
  formatSchoolDate,
  HOMEWORK_LABELS,
  INCIDENT_LABELS,
  OUTCOME_LABELS,
  REASON_LABELS,
} from "./labels";

const firstWeekEnd = dateKey(addDays(parseISO(SEMESTER.startDate), 4));
const recycleRetentionMs = 30 * 24 * 60 * 60 * 1000;

const exceptionSlot = (item: TimetableException) =>
  item.type === "cancel"
    ? WEEKLY_SCHEDULE.find((slot) => slot.id === item.scheduleSlotId)
    : item.type === "add"
      ? item.replacement
      : undefined;

const exceptionTypeLabel = (item: TimetableException) =>
  item.type === "cancel"
    ? "停課"
    : item.type === "add"
      ? "補課／調課"
      : item.type === "holiday"
        ? "國定假日"
        : "撤銷國定假日";

const conflictSummary = (
  counts: ReturnType<typeof holidayConflictsForDate>,
) =>
  [
    counts.assignments ? `作業 ${counts.assignments} 筆` : "",
    counts.classroomIncidents ? `課堂事件 ${counts.classroomIncidents} 筆` : "",
    counts.addedLessons ? `補課／調課 ${counts.addedLessons} 筆` : "",
  ]
    .filter(Boolean)
    .join("、") || "無";

const isBackupShape = (value: unknown): value is AppSnapshot => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AppSnapshot>;
  return (
    item.schemaVersion === 1 &&
    Array.isArray(item.assignments) &&
    Array.isArray(item.submissionEvents) &&
    Array.isArray(item.classroomIncidents) &&
    Array.isArray(item.timetableExceptions) &&
    Boolean(item.attentionWeights)
  );
};

export function RecordsPage() {
  const { snapshot, restore, mode } = useAppData();
  const [classFilter, setClassFilter] = useState<"" | ClassId>("");
  const [subjectFilter, setSubjectFilter] = useState<"" | SubjectId>("");
  const [seatFilter, setSeatFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(SEMESTER.startDate);
  const [dateTo, setDateTo] = useState(firstWeekEnd);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const seatNumber = seatFilter ? Number(seatFilter) : undefined;
  const currentAssignments = useMemo(
    () => activeAssignments(snapshot),
    [snapshot.assignments, snapshot.assignmentRevocations],
  );

  const assignmentMap = useMemo(
    () => new Map(currentAssignments.map((assignment) => [assignment.id, assignment])),
    [currentAssignments],
  );
  const filteredAssignments = useMemo(
    () =>
      currentAssignments
        .filter(
          (item) =>
            (!classFilter || item.classId === classFilter) &&
            (!subjectFilter || item.subjectId === subjectFilter) &&
            item.assignedDate >= dateFrom &&
            item.assignedDate <= dateTo,
        )
        .sort((a, b) => `${b.assignedDate}-${b.period}`.localeCompare(`${a.assignedDate}-${a.period}`)),
    [classFilter, currentAssignments, dateFrom, dateTo, subjectFilter],
  );

  const outstandingCandidateAssignments = useMemo(
    () =>
      currentAssignments.filter(
        (item) =>
          (!classFilter || item.classId === classFilter) &&
          (!subjectFilter || item.subjectId === subjectFilter) &&
          item.assignedDate <= dateTo,
      ),
    [classFilter, currentAssignments, dateTo, subjectFilter],
  );

  const outstandingRows = useMemo(
    () =>
      outstandingCandidateAssignments.flatMap((assignment) => {
        const latest = latestSubmissionBySeat(assignment.id, snapshot.submissionEvents);
        return CLASSES[assignment.classId].seats
          .filter((seat) => (!seatNumber || seat === seatNumber) && latest.get(seat)?.outcome === "still-missing")
          .map((seat) => ({ assignment, seat, event: latest.get(seat)! }));
      }),
    [outstandingCandidateAssignments, seatNumber, snapshot.submissionEvents],
  );

  const historicalMissingRows = useMemo(
    () =>
      outstandingCandidateAssignments.flatMap((assignment) => {
        const eventsForAssignment = snapshot.submissionEvents.filter(
          (event) => event.assignmentId === assignment.id,
        );
        const historicalLatest = latestSubmissionBySeatAsOf(
          assignment.id,
          eventsForAssignment,
          dateTo,
        );
        const currentLatest = latestSubmissionBySeat(assignment.id, snapshot.submissionEvents);
        return CLASSES[assignment.classId].seats
          .filter(
            (seat) =>
              (!seatNumber || seat === seatNumber) &&
              historicalLatest.get(seat)?.outcome === "still-missing",
          )
          .map((seat) => ({
            assignment,
            seat,
            historicalEvent: historicalLatest.get(seat)!,
            currentEvent: currentLatest.get(seat) ?? historicalLatest.get(seat)!,
          }));
      }),
    [dateTo, outstandingCandidateAssignments, seatNumber, snapshot.submissionEvents],
  );

  const filteredSubmissionEvents = useMemo(
    () =>
      snapshot.submissionEvents
        .filter((event) => {
          const assignment = assignmentMap.get(event.assignmentId);
          return (
            Boolean(assignment) &&
            (!classFilter || event.classId === classFilter) &&
            (!subjectFilter || assignment?.subjectId === subjectFilter) &&
            (!seatNumber || event.seatNumber === seatNumber) &&
            event.occurredOn >= dateFrom &&
            event.occurredOn <= dateTo
          );
        })
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [assignmentMap, classFilter, dateFrom, dateTo, seatNumber, snapshot.submissionEvents, subjectFilter],
  );

  const filteredIncidents = useMemo(
    () =>
      snapshot.classroomIncidents
        .filter(
          (item) =>
            (!classFilter || item.classId === classFilter) &&
            (!subjectFilter || item.subjectId === subjectFilter) &&
            (!seatNumber || item.seatNumber === seatNumber) &&
            item.date >= dateFrom &&
            item.date <= dateTo,
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [classFilter, dateFrom, dateTo, seatNumber, snapshot.classroomIncidents, subjectFilter],
  );

  const filteredExceptions = useMemo(
    () =>
      snapshot.timetableExceptions
        .filter((item) => item.date >= dateFrom && item.date <= dateTo)
        .filter((item) => {
          const slot = exceptionSlot(item);
          if (!slot) return true;
          return (
            (!classFilter || slot.classId === classFilter) &&
            (!subjectFilter || slot.subjectId === subjectFilter)
          );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [classFilter, dateFrom, dateTo, snapshot.timetableExceptions, subjectFilter],
  );

  const attentionRows = useMemo(() => {
    const groups = new Map<string, { classId: ClassId; seat: number; score: number; count: number; categories: Set<string>; lastDate: string }>();
    filteredIncidents.forEach((incident) => {
      if (incident.seatNumber === undefined) return;
      const key = `${incident.classId}-${incident.seatNumber}`;
      const current = groups.get(key) ?? {
        classId: incident.classId,
        seat: incident.seatNumber,
        score: 0,
        count: 0,
        categories: new Set<string>(),
        lastDate: incident.date,
      };
      current.score += snapshot.attentionWeights[incident.category];
      current.count += 1;
      current.categories.add(INCIDENT_LABELS[incident.category]);
      if (incident.date > current.lastDate) current.lastDate = incident.date;
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => b.score - a.score || a.classId.localeCompare(b.classId) || a.seat - b.seat);
  }, [filteredIncidents, snapshot.attentionWeights]);

  const needsAttention = attentionRows.filter((row) => row.score >= snapshot.attentionWeights.threshold);
  const uniqueOutstandingStudents = new Set(outstandingRows.map((row) => `${row.assignment.classId}-${row.seat}`)).size;
  const nowMillis = Date.now();
  const deletionAuditMap = new Map(
    snapshot.deletionAudits.map((item) => [item.id, item]),
  );
  const recycleAssignments = snapshot.assignmentRevocations
    .map((revocation) => ({
      revocation,
      assignment: snapshot.assignments.find(
        (item) => item.id === revocation.assignmentId,
      ),
      purgeAt: new Date(
        Date.parse(revocation.deletedAt) + recycleRetentionMs,
      ).toISOString(),
      audit: deletionAuditMap.get(`assignment_${revocation.assignmentId}`),
    }))
    .filter((item) => Date.parse(item.purgeAt) > nowMillis)
    .sort((a, b) => b.revocation.deletedAt.localeCompare(a.revocation.deletedAt));
  const recycleIncidents = snapshot.deletedRecords
    .filter(
      (item): item is DeletedIncidentRecord =>
        item.recordType === "classroom-incident" &&
        Date.parse(item.purgeAt) > nowMillis,
    )
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  const recycleSubmissions = snapshot.deletedRecords
    .filter(
      (item): item is DeletedSubmissionRecord =>
        item.recordType === "submission-event" &&
        Date.parse(item.purgeAt) > nowMillis,
    )
    .sort((a, b) => b.payload.recordedAt.localeCompare(a.payload.recordedAt));
  const recycleSubmissionsByAssignment = new Map<string, DeletedSubmissionRecord[]>();
  recycleSubmissions.forEach((record) => {
    const current = recycleSubmissionsByAssignment.get(record.parentAssignmentId) ?? [];
    current.push(record);
    recycleSubmissionsByAssignment.set(record.parentAssignmentId, current);
  });
  const recycleCount = recycleAssignments.length + recycleIncidents.length;
  const deletionAudits = [...snapshot.deletionAudits].sort((a, b) =>
    b.deletedAt.localeCompare(a.deletedAt),
  );

  const report = useMemo<ReportExport>(() => ({
    title: `英語作業與課堂紀錄_${dateFrom}_${dateTo}`,
    subtitle: `${dateFrom} 至 ${dateTo}｜${classFilter || "全部班級"}｜${subjectFilter ? SUBJECTS[subjectFilter].label : "全部科目"}${seatNumber ? `｜${seatNumber} 號` : ""}`,
    tables: [
      {
        name: "作業明細",
        rows: filteredAssignments.map((item) => {
          const missing = outstandingRows.filter((row) => row.assignment.id === item.id).map((row) => row.seat);
          return {
            日期: item.assignedDate,
            節次: item.period,
            班級: item.classId,
            科目: SUBJECTS[item.subjectId].label,
            類型: HOMEWORK_LABELS[item.homeworkType],
            作業內容: item.content,
            目前未補交座號: missing.join("、") || "無",
            假日資料衝突: activeHolidayForDate(item.assignedDate, snapshot.timetableExceptions)
              ? "資料衝突待確認"
              : "無",
          };
        }),
      },
      {
        name: "未補交清單",
        rows: outstandingRows.map(({ assignment, seat, event }) => ({
          作業日期: assignment.assignedDate,
          班級: assignment.classId,
          座號: seat,
          科目: SUBJECTS[assignment.subjectId].label,
          作業內容: assignment.content,
          未交原因: event.reason ? REASON_LABELS[event.reason] : "未註記",
          狀態日期: event.occurredOn,
          備註: event.note ?? "",
        })),
      },
      {
        name: "截止日未交追蹤",
        rows: historicalMissingRows.map(
          ({ assignment, seat, historicalEvent, currentEvent }) => ({
            作業日期: assignment.assignedDate,
            截止查詢日: dateTo,
            班級: assignment.classId,
            座號: seat,
            科目: SUBJECTS[assignment.subjectId].label,
            作業內容: assignment.content,
            截止日狀態: "仍未交",
            當時未交原因: historicalEvent.reason
              ? REASON_LABELS[historicalEvent.reason]
              : "未註記",
            目前狀態: OUTCOME_LABELS[currentEvent.outcome],
            目前狀態日期: currentEvent.occurredOn,
            是否已結案: currentEvent.outcome === "still-missing" ? "否" : "是",
          }),
        ),
      },
      {
        name: "繳交歷程",
        rows: filteredSubmissionEvents.map((event) => {
          const assignment = assignmentMap.get(event.assignmentId);
          return {
            狀態日期: event.occurredOn,
            班級: event.classId,
            座號: event.seatNumber,
            科目: assignment ? SUBJECTS[assignment.subjectId].label : "",
            作業內容: assignment?.content ?? "",
            繳交結果: OUTCOME_LABELS[event.outcome],
            原未交原因: event.reason ? REASON_LABELS[event.reason] : "",
            備註: event.note ?? "",
            登記時間: formatDateTime(event.recordedAt),
          };
        }),
      },
      {
        name: "需關注摘要",
        rows: attentionRows.map((row) => ({
          班級: row.classId,
          座號: row.seat,
          事件次數: row.count,
          加權分數: row.score,
          判定: row.score >= snapshot.attentionWeights.threshold ? "需教師確認" : "未達門檻",
          事件類型: [...row.categories].join("、"),
          最近日期: row.lastDate,
        })),
      },
      {
        name: "課堂事件",
        rows: filteredIncidents.map((item) => ({
          日期: item.date,
          節次: item.period,
          班級: item.classId,
          座號: item.seatNumber ?? "未指定",
          科目: SUBJECTS[item.subjectId].label,
          事件類型: INCIDENT_LABELS[item.category],
          分數: snapshot.attentionWeights[item.category],
          文字內容: item.note ?? "",
          登記時間: formatDateTime(item.recordedAt),
          假日資料衝突: activeHolidayForDate(item.date, snapshot.timetableExceptions)
            ? "資料衝突待確認"
            : "無",
        })),
      },
      {
        name: "課表異動",
        rows: filteredExceptions.map((item) => {
          const slot = exceptionSlot(item);
          const target = item.type === "holiday-revoke"
            ? snapshot.timetableExceptions.find(
                (candidate) => candidate.id === item.targetHolidayId && candidate.type === "holiday",
              )
            : undefined;
          const revocation = item.type === "holiday"
            ? revocationForHoliday(item.id, snapshot.timetableExceptions)
            : undefined;
          const conflicts = item.type === "holiday"
            ? holidayConflictsForDate(item.date, snapshot)
            : undefined;
          const content = item.type === "holiday"
            ? item.holidayName ?? ""
            : item.type === "holiday-revoke"
              ? target?.holidayName ?? "找不到原假日"
              : slot
                ? `${slot.classId}・${SUBJECTS[slot.subjectId].label}・第 ${slot.period} 節`
                : "找不到原課程";
          return {
            日期: item.date,
            異動類型: exceptionTypeLabel(item),
            異動內容: content,
            狀態:
              item.type === "holiday"
                ? revocation
                  ? "已撤銷"
                  : "有效・全天不上課"
                : item.type === "holiday-revoke"
                  ? "撤銷紀錄・原課表已恢復"
                  : "已登記",
            資料衝突: conflicts ? conflictSummary(conflicts) : "無",
            原因或備註: item.note ?? "",
            登記時間: formatDateTime(item.createdAt),
          };
        }),
      },
    ],
  }), [
    assignmentMap,
    attentionRows,
    classFilter,
    dateFrom,
    dateTo,
    filteredAssignments,
    filteredIncidents,
    filteredExceptions,
    filteredSubmissionEvents,
    historicalMissingRows,
    outstandingRows,
    seatNumber,
    snapshot.attentionWeights,
    snapshot.timetableExceptions,
    subjectFilter,
  ]);

  const chooseFirstWeek = () => {
    setDateFrom(SEMESTER.startDate);
    setDateTo(firstWeekEnd);
  };
  const chooseSemester = () => {
    setDateFrom(SEMESTER.startDate);
    setDateTo(SEMESTER.endDate);
  };
  const chooseThisWeek = () => {
    const today = dateKey(new Date());
    const bounded = today < SEMESTER.startDate ? SEMESTER.startDate : today > SEMESTER.endDate ? SEMESTER.endDate : today;
    const start = weekStartKey(bounded);
    setDateFrom(start < SEMESTER.startDate ? SEMESTER.startDate : start);
    const end = dateKey(addDays(parseISO(start), 4));
    setDateTo(end > SEMESTER.endDate ? SEMESTER.endDate : end);
  };

  const exportXlsx = async () => {
    try {
      setExporting(true);
      setError("");
      await downloadXlsxReport(report);
      setMessage("XLSX 報表已下載；包含作業、未補交、繳交歷程、需關注、課堂事件與課表異動工作表。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "XLSX 匯出失敗。");
    } finally {
      setExporting(false);
    }
  };

  const readBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      setError("");
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackupShape(parsed)) throw new Error("這不是可辨識的第 1 版備份檔。");
      const confirmed = window.confirm(
        `即將以「${file.name}」取代目前所有作業、繳交、課堂與設定資料。請確認已先下載現有備份。是否繼續？`,
      );
      if (!confirmed) return;
      await restore(parsed);
      setMessage(`已還原備份：${file.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "備份還原失敗。");
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  return (
    <div className="page-stack records-page" data-print-root>
      <PageHeading
        eyebrow="04・週末不漏接"
        title="後臺紀錄"
        description="依日期、班級、座號與科目查詢；未補交與需關注都以目前最新狀態計算。"
        actions={
          <div className="export-actions no-print">
            <button className="button button--ghost button--small" type="button" onClick={() => downloadCsvReport(report)}>CSV</button>
            <button className="button button--ghost button--small" type="button" disabled={exporting} onClick={() => void exportXlsx()}>{exporting ? "產生中…" : "XLSX"}</button>
            <button className="button button--ghost button--small" type="button" onClick={() => window.print()}>列印</button>
          </div>
        }
      />

      <Panel className="report-filter-panel no-print">
        <div className="quick-range">
          <span>快速範圍</span>
          <button type="button" onClick={chooseThisWeek}>本週</button>
          <button type="button" onClick={chooseFirstWeek}>開學首週</button>
          <button type="button" onClick={chooseSemester}>整學期</button>
        </div>
        <div className="report-filter-grid">
          <label className="field"><span>起始日期</span><input type="date" min={SEMESTER.startDate} max={dateTo} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="field"><span>結束日期</span><input type="date" min={dateFrom} max={SEMESTER.endDate} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label className="field"><span>班級</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value as "" | ClassId)}><option value="">全部班級</option>{CLASS_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
          <label className="field"><span>座號</span><input type="number" min={1} max={26} value={seatFilter} onChange={(event) => setSeatFilter(event.target.value)} placeholder="全部" /></label>
          <label className="field"><span>科目</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value as "" | SubjectId)}><option value="">全部科目</option>{SUBJECT_IDS.map((id) => <option key={id} value={id}>{SUBJECTS[id].label}</option>)}</select></label>
        </div>
      </Panel>

      <div className="print-heading">
        <h1>英語作業與課堂紀錄</h1>
        <p>{report.subtitle}</p>
      </div>

      {message ? <p className="form-success no-print" role="status">{message}</p> : null}
      {error ? <p className="form-error no-print" role="alert">{error}</p> : null}

      <div className="stat-grid">
        <StatCard tone="blue" label="本範圍作業" value={filteredAssignments.length} detail={`${dateFrom} 至 ${dateTo}`} />
        <StatCard tone="orange" label="仍未補交筆數" value={outstandingRows.length} detail={`涉及 ${uniqueOutstandingStudents} 位學生`} />
        <StatCard tone="pink" label="需教師確認" value={needsAttention.length} detail={`門檻 ${snapshot.attentionWeights.threshold} 分`} />
        <StatCard tone="green" label="課堂事件" value={filteredIncidents.length} detail="包含未指定座號紀錄" />
      </div>

      <Panel className="report-section report-section--outstanding">
        <div className="panel-heading"><div><p className="eyebrow">尚未結案・包含較早作業</p><h3>未補交清單</h3></div><span className="count-bubble count-bubble--danger">{outstandingRows.length}</span></div>
        {outstandingRows.length ? (
          <div className="table-scroll" role="region" aria-label="未補交清單，可水平捲動" tabIndex={0}>
            <table className="data-table">
              <thead><tr><th>作業日期</th><th>班級／座號</th><th>科目</th><th>作業內容</th><th>未交原因</th><th>狀態日期</th></tr></thead>
              <tbody>{outstandingRows.map(({ assignment, seat, event }) => (
                <tr key={`${assignment.id}-${seat}`}>
                  <td>{formatSchoolDate(assignment.assignedDate)}</td>
                  <td><div className="table-class-seat"><ClassBadge classId={assignment.classId} /><strong>{seat} 號</strong></div></td>
                  <td><SubjectBadge subjectId={assignment.subjectId} /></td>
                  <td><strong>{assignment.content}</strong><small>{HOMEWORK_LABELS[assignment.homeworkType]}・第 {assignment.period} 節</small></td>
                  <td>{event.reason ? REASON_LABELS[event.reason] : "未註記"}</td>
                  <td>{event.occurredOn}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState icon="✓" title="目前沒有未補交作業">此篩選範圍內的作業都已結案，或尚未登記例外座號。</EmptyState>}
      </Panel>

      <Panel className="report-section report-section--historical">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">時間點追蹤・截至 {dateTo}</p>
            <h3>截止日當時未交，現在是否已補交</h3>
          </div>
          <span className="count-bubble">{historicalMissingRows.length}</span>
        </div>
        <InlineNotice title="歷史狀態與目前狀態分開呈現">
          此表保留「截至查詢結束日仍未交」的事實，再對照目前最新紀錄；日後補交不會抹掉先前未交歷程。
        </InlineNotice>
        {historicalMissingRows.length ? (
          <div className="table-scroll" role="region" aria-label="截止日未交追蹤，可水平捲動" tabIndex={0}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>作業日期</th>
                  <th>班級／座號</th>
                  <th>作業</th>
                  <th>{dateTo} 當時</th>
                  <th>目前最新狀態</th>
                  <th>是否結案</th>
                </tr>
              </thead>
              <tbody>
                {historicalMissingRows.map(
                  ({ assignment, seat, historicalEvent, currentEvent }) => (
                    <tr key={`historical-${assignment.id}-${seat}`}>
                      <td>{formatSchoolDate(assignment.assignedDate)}</td>
                      <td>
                        <div className="table-class-seat">
                          <ClassBadge classId={assignment.classId} />
                          <strong>{seat} 號</strong>
                        </div>
                      </td>
                      <td>
                        <strong>{assignment.content}</strong>
                        <small>{SUBJECTS[assignment.subjectId].label}・第 {assignment.period} 節</small>
                      </td>
                      <td>
                        <span className="status-pill status-pill--still-missing">仍未交</span>
                        <small>
                          {historicalEvent.reason
                            ? REASON_LABELS[historicalEvent.reason]
                            : "未註記原因"}
                        </small>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${currentEvent.outcome}`}>
                          {OUTCOME_LABELS[currentEvent.outcome]}
                        </span>
                        <small>狀態日期 {currentEvent.occurredOn}</small>
                      </td>
                      <td>
                        <strong className={currentEvent.outcome === "still-missing" ? "resolution resolution--open" : "resolution resolution--done"}>
                          {currentEvent.outcome === "still-missing" ? "尚未結案" : "已結案"}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="✓" title="截止日當時沒有未交紀錄">
            此日期以前沒有座號被登記為仍未交。
          </EmptyState>
        )}
      </Panel>

      <Panel className="report-section report-section--attention">
        <div className="panel-heading"><div><p className="eyebrow">由教師做最後判斷</p><h3>課堂需關注摘要</h3></div><span className="count-bubble">{needsAttention.length}</span></div>
        <InlineNotice tone="warning" title="這是提示，不是診斷或懲處結論">
          分數以目前權重重新計算；達 {snapshot.attentionWeights.threshold} 分才列為「需教師確認」。請搭配事件明細與實際情境判斷。
        </InlineNotice>
        {attentionRows.length ? (
          <div className="attention-grid">
            {attentionRows.map((row) => (
              <article key={`${row.classId}-${row.seat}`} className={row.score >= snapshot.attentionWeights.threshold ? "attention-card is-flagged" : "attention-card"}>
                <div><ClassBadge classId={row.classId} /><strong>{row.seat} 號</strong></div>
                <span className="attention-score"><b>{row.score}</b> 分</span>
                <p>{[...row.categories].join("、")}</p>
                <small>{row.count} 次事件・最近 {row.lastDate}</small>
                <em>{row.score >= snapshot.attentionWeights.threshold ? "需教師確認" : "未達門檻"}</em>
              </article>
            ))}
          </div>
        ) : <EmptyState icon="○" title="此範圍沒有具名座號事件">未指定座號的文字紀錄仍會保留在匯出明細中。</EmptyState>}
      </Panel>

      <Panel className="report-section">
        <div className="panel-heading"><div><p className="eyebrow">狀態變化不覆寫</p><h3>繳交與補交歷程</h3></div><span className="count-bubble">{filteredSubmissionEvents.length}</span></div>
        {filteredSubmissionEvents.length ? (
          <div className="table-scroll" role="region" aria-label="繳交歷程，可水平捲動" tabIndex={0}>
            <table className="data-table">
              <thead><tr><th>日期</th><th>班級／座號</th><th>作業</th><th>結果</th><th>原因／備註</th><th>登記時間</th></tr></thead>
              <tbody>{filteredSubmissionEvents.slice(0, 100).map((event) => {
                const assignment = assignmentMap.get(event.assignmentId);
                return (
                  <tr key={event.id}>
                    <td>{event.occurredOn}</td>
                    <td><div className="table-class-seat"><ClassBadge classId={event.classId} /><strong>{event.seatNumber} 號</strong></div></td>
                    <td><strong>{assignment?.content ?? "作業資料不存在"}</strong><small>{assignment ? `${SUBJECTS[assignment.subjectId].label}・${assignment.assignedDate}` : ""}</small></td>
                    <td><span className={`status-pill status-pill--${event.outcome}`}>{OUTCOME_LABELS[event.outcome]}</span></td>
                    <td>{event.reason ? REASON_LABELS[event.reason] : "—"}<small>{event.note}</small></td>
                    <td>{formatDateTime(event.recordedAt)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState icon="↻" title="此範圍尚無繳交歷程">請先在「作業繳交」頁登記座號狀態。</EmptyState>}
        {filteredSubmissionEvents.length > 100 ? <p className="table-limit-note">畫面僅顯示最新 100 筆；匯出檔會包含全部 {filteredSubmissionEvents.length} 筆。</p> : null}
      </Panel>

      <Panel className="report-section">
        <div className="panel-heading"><div><p className="eyebrow">固定課表不覆寫</p><h3>課表異動與國定假日</h3></div><span className="count-bubble">{filteredExceptions.length}</span></div>
        {filteredExceptions.length ? (
          <div className="table-scroll" role="region" aria-label="課表異動歷程，可水平捲動" tabIndex={0}>
            <table className="data-table">
              <thead><tr><th>日期</th><th>異動類型</th><th>內容</th><th>狀態</th><th>資料衝突／備註</th><th>登記時間</th></tr></thead>
              <tbody>{filteredExceptions.map((item) => {
                const slot = exceptionSlot(item);
                const target = item.type === "holiday-revoke"
                  ? snapshot.timetableExceptions.find((candidate) => candidate.id === item.targetHolidayId && candidate.type === "holiday")
                  : undefined;
                const revocation = item.type === "holiday" ? revocationForHoliday(item.id, snapshot.timetableExceptions) : undefined;
                const conflicts = item.type === "holiday" ? holidayConflictsForDate(item.date, snapshot) : undefined;
                return (
                  <tr key={item.id}>
                    <td>{formatSchoolDate(item.date)}</td>
                    <td><span className={`exception-type exception-type--${item.type}`}>{exceptionTypeLabel(item)}</span></td>
                    <td><strong>{item.type === "holiday" ? item.holidayName : item.type === "holiday-revoke" ? target?.holidayName || "找不到原假日" : slot ? `${slot.classId}・${SUBJECTS[slot.subjectId].label}` : "找不到原課程"}</strong><small>{slot ? `第 ${slot.period} 節` : ""}</small></td>
                    <td>{item.type === "holiday" ? (revocation ? "已撤銷" : "有效・全天不上課") : item.type === "holiday-revoke" ? "原課表已恢復" : "已登記"}</td>
                    <td>{conflicts?.total ? <span className="conflict-badge">資料衝突待確認・{conflictSummary(conflicts)}</span> : "無衝突"}<small>{item.note || "未填備註"}</small></td>
                    <td>{formatDateTime(item.createdAt)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <EmptyState icon="↔" title="此範圍沒有課表異動">停課、補課、國定假日與撤銷紀錄會顯示在這裡及匯出檔中。</EmptyState>}
      </Panel>

      <Panel className="report-section recycle-panel no-print">
        <div className="panel-heading"><div><p className="eyebrow">僅教師可見・無法還原</p><h3>30 天回收區</h3></div><span className="count-bubble">{recycleCount}</span></div>
        <InlineNotice tone="warning" title="回收資料不會進入報表或 JSON 備份">
          課堂事件與作業連動的繳交歷程會在刪除後保留 30 天，再由系統永久清除；作業本身保留最小作廢狀態，避免舊資料重新出現。
        </InlineNotice>
        {recycleCount ? (
          <div className="recycle-grid">
            {recycleAssignments.map(({ revocation, assignment, purgeAt, audit }) => {
              const relatedRecords = recycleSubmissionsByAssignment.get(revocation.assignmentId) ?? [];
              return <article className="recycle-card" key={`assignment-${revocation.id}`}>
                <div className="recycle-card__heading"><span>作業已作廢</span><em>不可還原</em></div>
                {assignment ? (
                  <>
                    <div className="recycle-card__badges"><ClassBadge classId={assignment.classId} /><SubjectBadge subjectId={assignment.subjectId} /></div>
                    <strong>{HOMEWORK_LABELS[assignment.homeworkType]}・{assignment.content}</strong>
                    <p>{formatSchoolDate(assignment.assignedDate)}・第 {assignment.period} 節</p>
                  </>
                ) : <strong>找不到原作業內容</strong>}
                <small>刪除於 {formatDateTime(revocation.deletedAt)}・連動 {audit?.deletedCount ?? 0} 筆繳交歷程</small>
                <small>連動回收資料清除時間：{formatDateTime(purgeAt)}</small>
                {relatedRecords.length ? (
                  <details className="recycle-card__events">
                    <summary>查看連動繳交歷程（{relatedRecords.length}）</summary>
                    <ul>
                      {relatedRecords.map((record) => {
                        const event = record.payload;
                        return (
                          <li key={record.id}>
                            <strong>{event.seatNumber} 號・{OUTCOME_LABELS[event.outcome]}</strong>
                            <span>{event.occurredOn}{event.reason ? `・${REASON_LABELS[event.reason]}` : ""}</span>
                            {event.note ? <small>{event.note}</small> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </article>;
            })}
            {recycleIncidents.map((record) => {
              const incident = record.payload;
              return (
                <article className="recycle-card" key={record.id}>
                  <div className="recycle-card__heading"><span>課堂事件已刪除</span><em>不可還原</em></div>
                  <div className="recycle-card__badges"><ClassBadge classId={incident.classId} /><SubjectBadge subjectId={incident.subjectId} /></div>
                  <strong>{incident.seatNumber ? `${incident.seatNumber} 號・` : ""}{INCIDENT_LABELS[incident.category]}</strong>
                  <p>{incident.note || "未填備註"}</p>
                  <small>{formatSchoolDate(incident.date)}・第 {incident.period} 節・刪除於 {formatDateTime(record.deletedAt)}</small>
                  <small>永久清除時間：{formatDateTime(record.purgeAt)}</small>
                </article>
              );
            })}
          </div>
        ) : <EmptyState icon="♲" title="回收區目前是空的">刪除的課堂事件與近期作廢作業會暫時顯示在這裡。</EmptyState>}

        <details className="recycle-audit">
          <summary>永久稽核摘要（{deletionAudits.length}）</summary>
          {deletionAudits.length ? (
            <div className="table-scroll" role="region" aria-label="刪除稽核摘要，可水平捲動" tabIndex={0}>
              <table className="data-table">
                <thead><tr><th>類型</th><th>原始 ID</th><th>刪除時間</th><th>連動筆數</th></tr></thead>
                <tbody>{deletionAudits.map((audit) => (
                  <tr key={audit.id}>
                    <td>{audit.recordType === "assignment" ? "作業作廢" : "課堂事件刪除"}</td>
                    <td><code>{audit.originalId}</code></td>
                    <td>{formatDateTime(audit.deletedAt)}</td>
                    <td>{audit.deletedCount}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p>尚無刪除稽核紀錄。</p>}
        </details>
      </Panel>

      <Panel className="backup-panel no-print">
        <div><p className="eyebrow">可攜與復原</p><h3>完整資料備份</h3><p>報表匯出只含目前篩選範圍；JSON 備份包含全部有效資料、作廢狀態、刪除稽核與設定，但不包含 30 天回收資料。</p></div>
        <div className="backup-actions">
          <button className="button button--dark" type="button" onClick={() => downloadJsonBackup(snapshot)}>下載 JSON 完整備份</button>
          {mode === "demo" ? (
            <>
              <label className="button button--ghost" htmlFor="restore-backup">還原 JSON 備份</label>
              <input ref={restoreInputRef} id="restore-backup" className="visually-hidden-input" type="file" accept="application/json,.json" onChange={(event) => void readBackup(event.target.files?.[0])} />
            </>
          ) : (
            <button className="button button--ghost" type="button" disabled title="Firebase 採 append-only 規則，還原需由受控後端工具執行">
              還原需受控後端匯入
            </button>
          )}
        </div>
        {mode === "firebase" ? <small className="backup-mode-note">Firebase 瀏覽器規則仍禁止直接刪除；刪除只會透過已驗證的受控後端執行。</small> : null}
      </Panel>
    </div>
  );
}
