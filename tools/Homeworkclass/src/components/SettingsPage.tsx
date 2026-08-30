import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CLASSES, PERIODS, SEMESTER, SUBJECTS, WEEKLY_SCHEDULE } from "../data/semester";
import {
  activeHolidayForDate,
  createId,
  holidayConflictsForDate,
  revocationForHoliday,
  scheduleForDate,
} from "../domain/logic";
import { useAppData } from "../state/AppDataContext";
import {
  CLASS_IDS,
  SUBJECT_IDS,
  type AppSnapshot,
  type ClassId,
  type SubjectId,
  type TimetableException,
  type TimetableExceptionType,
} from "../types";
import { ClassBadge, EmptyState, InlineNotice, PageHeading, Panel, SubjectBadge } from "./Common";
import { formatDateTime, formatSchoolDate, INCIDENT_LABELS } from "./labels";

const conflictText = (
  counts: ReturnType<typeof holidayConflictsForDate>,
) =>
  [
    counts.assignments ? `作業 ${counts.assignments} 筆` : "",
    counts.classroomIncidents ? `課堂事件 ${counts.classroomIncidents} 筆` : "",
    counts.addedLessons ? `補課／調課 ${counts.addedLessons} 筆` : "",
  ]
    .filter(Boolean)
    .join("、");

export function SettingsPage() {
  const { snapshot, updateWeights, addException, mode } = useAppData();
  const [weights, setWeights] = useState<AppSnapshot["attentionWeights"]>(snapshot.attentionWeights);
  const [exceptionType, setExceptionType] = useState<TimetableExceptionType>("cancel");
  const [exceptionDate, setExceptionDate] = useState(SEMESTER.startDate);
  const [slotId, setSlotId] = useState("");
  const [period, setPeriod] = useState(1);
  const [classId, setClassId] = useState<ClassId>("六甲");
  const [subjectId, setSubjectId] = useState<SubjectId>("english");
  const [holidayName, setHolidayName] = useState("");
  const [note, setNote] = useState("");
  const [revokingHolidayId, setRevokingHolidayId] = useState("");
  const [revocationReason, setRevocationReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setWeights(snapshot.attentionWeights), [snapshot.attentionWeights]);

  const cancellableSlots = useMemo(
    () =>
      scheduleForDate(exceptionDate, snapshot.timetableExceptions).filter((slot) =>
        WEEKLY_SCHEDULE.some((base) => base.id === slot.id),
      ),
    [exceptionDate, snapshot.timetableExceptions],
  );
  const selectedCancelSlot = cancellableSlots.find((slot) => slot.id === slotId) ?? cancellableSlots[0];
  const selectedDateHoliday = activeHolidayForDate(
    exceptionDate,
    snapshot.timetableExceptions,
  );
  const selectedDateConflicts = holidayConflictsForDate(exceptionDate, snapshot);

  useEffect(() => {
    setSlotId(cancellableSlots[0]?.id ?? "");
  }, [exceptionDate, cancellableSlots.length]);

  const saveWeights = async (event: FormEvent) => {
    event.preventDefault();
    if (
      weights.threshold < 1 ||
      weights.threshold > 100 ||
      Object.entries(weights).some(
        ([key, value]) => key !== "threshold" && (value < 0 || value > 10),
      )
    ) {
      setError("四類事件權重須介於 0–10 分，提示門檻須介於 1–100 分。");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateWeights(weights);
      setMessage("需關注權重與門檻已儲存。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "設定儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  const saveException = async (event: FormEvent) => {
    event.preventDefault();
    if (exceptionType === "cancel" && !selectedCancelSlot) {
      setError("所選日期沒有可停課的固定課程。");
      return;
    }
    const time = PERIODS.find((item) => item.period === period);
    if (exceptionType === "add" && !time) {
      setError("請選擇有效節次。");
      return;
    }
    if (
      (exceptionType === "cancel" || exceptionType === "add") &&
      selectedDateHoliday
    ) {
      setError(`這一天是「${selectedDateHoliday.holidayName}」，不能新增課表異動。`);
      return;
    }
    if (exceptionType === "holiday" && !holidayName.trim()) {
      setError("請輸入假日名稱。");
      return;
    }
    if (exceptionType === "holiday" && selectedDateHoliday) {
      setError(`這一天已經登記為「${selectedDateHoliday.holidayName}」。`);
      return;
    }
    if (
      exceptionType === "add" &&
      scheduleForDate(exceptionDate, snapshot.timetableExceptions).some(
        (slot) => slot.period === period,
      )
    ) {
      setError("這個日期與節次已經有課。請先登記原課停課，或改選其他節次後再新增補課。");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const now = new Date().toISOString();
      let value: TimetableException;
      if (exceptionType === "cancel") {
        value = {
              id: createId("cancel"),
              date: exceptionDate,
              type: "cancel",
              scheduleSlotId: selectedCancelSlot!.id,
              note: note.trim() || undefined,
              createdAt: now,
            };
      } else if (exceptionType === "add") {
        value = {
              id: createId("makeup"),
              date: exceptionDate,
              type: "add",
              replacement: {
                id: createId("makeup-slot"),
                period,
                startTime: time!.startTime,
                endTime: time!.endTime,
                classId,
                subjectId,
              },
              note: note.trim() || undefined,
              createdAt: now,
            };
      } else {
        value = {
          id: createId("holiday"),
          date: exceptionDate,
          type: "holiday",
          holidayName: holidayName.trim(),
          note: note.trim() || undefined,
          createdAt: now,
        };
      }
      await addException(value);
      const typeLabel =
        exceptionType === "cancel"
          ? "停課"
          : exceptionType === "add"
            ? "補課"
            : `國定假日「${holidayName.trim()}」`;
      const conflictSuffix =
        exceptionType === "holiday" && selectedDateConflicts.total
          ? `；已保留並標示 ${conflictText(selectedDateConflicts)} 的資料衝突`
          : "";
      setMessage(`${formatSchoolDate(exceptionDate)}的${typeLabel}已新增${conflictSuffix}。`);
      setHolidayName("");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "課表異動儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  const revokeHoliday = async (
    event: FormEvent,
    holiday: TimetableException,
  ) => {
    event.preventDefault();
    if (!revocationReason.trim()) {
      setError("請輸入撤銷原因。");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await addException({
        id: createId("holiday-revoke"),
        date: holiday.date,
        type: "holiday-revoke",
        targetHolidayId: holiday.id,
        note: revocationReason.trim(),
        createdAt: new Date().toISOString(),
      });
      setMessage(`${formatSchoolDate(holiday.date)}的「${holiday.holidayName}」已撤銷；原課表效果已恢復。`);
      setRevokingHolidayId("");
      setRevocationReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "國定假日撤銷失敗。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="05・學期設定"
        title="設定"
        description="核對八班有效座號、調整需關注門檻，並保留停課、補課與國定假日的日期歷程。"
      />

      <div className="settings-grid">
        <Panel className="settings-section settings-section--wide">
          <div className="panel-heading"><div><p className="eyebrow">115 學年度第一學期</p><h3>班級與有效座號</h3></div><span className="count-bubble">155 人</span></div>
          <InlineNotice title="隱私界線">
            本系統只使用班級與座號，不保存姓名、正式學號、家長聯絡方式或輔導資料。
          </InlineNotice>
          <div className="roster-grid">
            {CLASS_IDS.map((id) => {
              const item = CLASSES[id];
              const missing = Array.from({ length: Math.max(...item.seats) }, (_, index) => index + 1).filter((seat) => !item.seats.includes(seat));
              return (
                <details key={id} className="roster-card">
                  <summary>
                    <ClassBadge classId={id} />
                    <span><strong>{item.seats.length} 人</strong><small>{missing.length ? `缺號：${missing.join("、")}` : "座號連續"}</small></span>
                    <span aria-hidden="true">⌄</span>
                  </summary>
                  <div className="roster-seats" aria-label={`${id}有效座號`}>
                    {item.seats.map((seat) => <span key={seat}>{seat}</span>)}
                  </div>
                </details>
              );
            })}
          </div>
        </Panel>

        <Panel className="settings-section">
          <div className="panel-heading"><div><p className="eyebrow">可調整</p><h3>需關注權重</h3></div><span className="settings-icon" aria-hidden="true">⚖</span></div>
          <form className="weights-form" onSubmit={saveWeights}>
            {(Object.keys(INCIDENT_LABELS) as Array<keyof typeof INCIDENT_LABELS>).map((category) => (
              <label className="weight-row" key={category}>
                <span>{INCIDENT_LABELS[category]}</span>
                <span><input type="number" min={0} max={10} value={weights[category]} onChange={(event) => setWeights((current) => ({ ...current, [category]: Number(event.target.value) }))} /><small>分</small></span>
              </label>
            ))}
            <label className="weight-row weight-row--threshold">
              <span><strong>每週提示門檻</strong><small>達門檻後仍由教師確認</small></span>
              <span><input type="number" min={1} max={100} value={weights.threshold} onChange={(event) => setWeights((current) => ({ ...current, threshold: Number(event.target.value) }))} /><small>分</small></span>
            </label>
            <button className="button button--primary button--full" type="submit" disabled={saving}>儲存權重設定</button>
          </form>
        </Panel>

        <Panel className="settings-section">
          <div className="panel-heading"><div><p className="eyebrow">固定課表不覆寫</p><h3>新增停課、補課或國定假日</h3></div><span className="settings-icon" aria-hidden="true">↔</span></div>
          <form className="exception-form" onSubmit={saveException}>
            <fieldset className="segmented-fieldset">
              <legend>異動類型</legend>
              <div>
                <label className={exceptionType === "cancel" ? "is-checked" : ""}><input type="radio" name="exception-type" value="cancel" checked={exceptionType === "cancel"} onChange={() => setExceptionType("cancel")} />停課</label>
                <label className={exceptionType === "add" ? "is-checked" : ""}><input type="radio" name="exception-type" value="add" checked={exceptionType === "add"} onChange={() => setExceptionType("add")} />補課／調課</label>
                <label className={exceptionType === "holiday" ? "is-checked" : ""}><input type="radio" name="exception-type" value="holiday" checked={exceptionType === "holiday"} onChange={() => setExceptionType("holiday")} />國定假日</label>
              </div>
            </fieldset>
            <label className="field"><span>異動日期</span><input type="date" min={SEMESTER.startDate} max={SEMESTER.endDate} value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /></label>

            {exceptionType === "cancel" ? (
              <label className="field"><span>要停的課程</span><select value={selectedCancelSlot?.id ?? ""} onChange={(event) => setSlotId(event.target.value)} disabled={!cancellableSlots.length}>{cancellableSlots.length ? cancellableSlots.map((slot) => <option key={slot.id} value={slot.id}>第 {slot.period} 節・{slot.classId}・{SUBJECTS[slot.subjectId].label}</option>) : <option value="">當天無固定課程</option>}</select></label>
            ) : exceptionType === "add" ? (
              <div className="form-grid form-grid--three">
                <label className="field"><span>節次</span><select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>{PERIODS.map((item) => <option key={item.period} value={item.period}>第 {item.period} 節（{item.startTime}）</option>)}</select></label>
                <label className="field"><span>班級</span><select value={classId} onChange={(event) => setClassId(event.target.value as ClassId)}>{CLASS_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
                <label className="field"><span>科目</span><select value={subjectId} onChange={(event) => setSubjectId(event.target.value as SubjectId)}>{SUBJECT_IDS.map((id) => <option key={id} value={id}>{SUBJECTS[id].label}</option>)}</select></label>
              </div>
            ) : (
              <label className="field"><span>假日名稱（必填）</span><input value={holidayName} maxLength={100} onChange={(event) => setHolidayName(event.target.value)} placeholder="例如：國慶日、教師節補假" /></label>
            )}
            {exceptionType === "holiday" && selectedDateConflicts.total ? (
              <InlineNotice tone="warning" title="資料衝突待確認">
                此日期已有{conflictText(selectedDateConflicts)}。仍可建立國定假日；原始資料會完整保留並標示衝突。
              </InlineNotice>
            ) : null}
            <label className="field"><span>備註（選填）</span><input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder={exceptionType === "holiday" ? "例如：依學校行事曆放假" : "例如：校慶補假、補週五課程"} /></label>
            <button className="button button--dark button--full" type="submit" disabled={saving}>新增課表異動</button>
          </form>
        </Panel>

        <Panel className="settings-section settings-section--wide">
          <div className="panel-heading"><div><p className="eyebrow">完整保留</p><h3>課表異動歷程</h3></div><span className="count-bubble">{snapshot.timetableExceptions.length}</span></div>
          {snapshot.timetableExceptions.length ? (
            <div className="exception-list">
              {[...snapshot.timetableExceptions].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`)).map((item) => {
                if (item.type === "holiday") {
                  const revocation = revocationForHoliday(item.id, snapshot.timetableExceptions);
                  const conflicts = holidayConflictsForDate(item.date, snapshot);
                  return (
                    <article className={revocation ? "exception-card is-revoked" : "exception-card"} key={item.id}>
                      <span className="exception-type exception-type--holiday">國定假日</span>
                      <div>
                        <strong>{formatSchoolDate(item.date)}・{item.holidayName}</strong>
                        <p><span className={revocation ? "holiday-status is-revoked" : "holiday-status"}>{revocation ? "已撤銷" : "全天不上課"}</span>{conflicts.total ? <span className="conflict-badge">資料衝突待確認・{conflictText(conflicts)}</span> : null}</p>
                        <small>{item.note || "未填備註"}・{formatDateTime(item.createdAt)}</small>
                        {revocation ? <small className="revocation-copy">撤銷原因：{revocation.note}・{formatDateTime(revocation.createdAt)}</small> : null}
                        {!revocation && revokingHolidayId !== item.id ? <button className="button button--ghost button--small holiday-revoke-button" type="button" onClick={() => { setRevokingHolidayId(item.id); setRevocationReason(""); setError(""); }}>撤銷國定假日</button> : null}
                        {!revocation && revokingHolidayId === item.id ? (
                          <form className="holiday-revoke-form" onSubmit={(event) => void revokeHoliday(event, item)}>
                            <label className="field"><span>撤銷原因（必填）</span><input value={revocationReason} maxLength={500} onChange={(event) => setRevocationReason(event.target.value)} placeholder="例如：日期登記錯誤" autoFocus /></label>
                            <div className="form-actions"><button className="button button--ghost button--small" type="button" onClick={() => { setRevokingHolidayId(""); setRevocationReason(""); }}>取消</button><button className="button button--danger button--small" type="submit" disabled={saving}>確認撤銷</button></div>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  );
                }
                if (item.type === "holiday-revoke") {
                  const target = snapshot.timetableExceptions.find((candidate) => candidate.id === item.targetHolidayId && candidate.type === "holiday");
                  return (
                    <article className="exception-card is-revocation" key={item.id}>
                      <span className="exception-type exception-type--holiday-revoke">撤銷假日</span>
                      <div><strong>{formatSchoolDate(item.date)}・{target?.holidayName || "找不到原假日"}</strong><p><span className="holiday-status is-revoked">原課表已恢復</span></p><small>原因：{item.note}・{formatDateTime(item.createdAt)}</small></div>
                    </article>
                  );
                }
                const base = item.type === "cancel" ? WEEKLY_SCHEDULE.find((slot) => slot.id === item.scheduleSlotId) : item.replacement;
                return (
                  <article className="exception-card" key={item.id}>
                    <span className={`exception-type exception-type--${item.type}`}>{item.type === "cancel" ? "停課" : "補課"}</span>
                    <div><strong>{formatSchoolDate(item.date)}・第 {base?.period ?? "?"} 節</strong><p>{base ? <><ClassBadge classId={base.classId} /> <SubjectBadge subjectId={base.subjectId} /></> : "找不到原課程"}</p><small>{item.note || "未填備註"}・{formatDateTime(item.createdAt)}</small></div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState icon="↔" title="尚無課表異動">固定 20 節課表會照常顯示；有停課或補課時再新增即可。</EmptyState>}
        </Panel>

        <Panel className="settings-section settings-section--wide system-info-panel">
          <div><p className="eyebrow">系統資訊</p><h3>資料模式與學期</h3></div>
          <dl>
            <div><dt>資料模式</dt><dd>{mode === "demo" ? "本機展示（瀏覽器 localStorage）" : "Firebase"}</dd></div>
            <div><dt>學期日期</dt><dd>{SEMESTER.startDate} 至 {SEMESTER.endDate}</dd></div>
            <div><dt>時區</dt><dd>{SEMESTER.timezone}</dd></div>
            <div><dt>固定週課表</dt><dd>20 節（英語 12、在地 4、國際歌謠 4）</dd></div>
          </dl>
          {mode === "demo" ? <InlineNotice tone="warning" title="尚非正式 Firebase 環境">正式 Rules、Secrets、App Check、Blaze 與部署仍需另外授權及驗證。</InlineNotice> : null}
        </Panel>
      </div>

      {message ? <p className="form-success" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
