import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CLASSES, SEMESTER, SUBJECTS } from "../data/semester";
import { activeHolidayForDate, createId, scheduleForDate } from "../domain/logic";
import { useAppData } from "../state/AppDataContext";
import type { IncidentCategory } from "../types";
import { ClassBadge, EmptyState, InlineNotice, PageHeading, Panel, SubjectBadge } from "./Common";
import { formatDateTime, formatSchoolDate, INCIDENT_LABELS } from "./labels";

export function IncidentPage() {
  const { snapshot, addIncident } = useAppData();
  const [selectedDate, setSelectedDate] = useState(SEMESTER.startDate);
  const [slotId, setSlotId] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("late");
  const [seat, setSeat] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const slots = useMemo(
    () => scheduleForDate(selectedDate, snapshot.timetableExceptions),
    [selectedDate, snapshot.timetableExceptions],
  );
  const activeSlot = slots.find((slot) => slot.id === slotId) ?? slots[0];
  const selectedHoliday = activeHolidayForDate(
    selectedDate,
    snapshot.timetableExceptions,
  );

  useEffect(() => {
    setSlotId(slots[0]?.id ?? "");
    setSeat("");
    setMessage("");
    setError("");
  }, [selectedDate, slots.length]);

  const existing = snapshot.classroomIncidents
    .filter(
      (item) =>
        item.date === selectedDate &&
        (!activeSlot || (item.period === activeSlot.period && item.classId === activeSlot.classId)),
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeSlot) {
      setError("請先選擇一節課。");
      return;
    }
    const seatNumber = seat ? Number(seat) : undefined;
    if (seatNumber !== undefined && !CLASSES[activeSlot.classId].seats.includes(seatNumber)) {
      setError("所選座號不在這個班級的有效座號表中。");
      return;
    }
    if (seatNumber === undefined && !note.trim()) {
      setError("未選座號時，請輸入簡短文字內容。");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await addIncident({
        id: createId("incident"),
        classId: activeSlot.classId,
        subjectId: activeSlot.subjectId,
        date: selectedDate,
        period: activeSlot.period,
        category,
        seatNumber,
        note: note.trim() || undefined,
        weight: snapshot.attentionWeights[category],
        recordedAt: new Date().toISOString(),
      });
      setMessage(`已記錄 ${activeSlot.classId}${seatNumber ? ` ${seatNumber} 號` : ""}的「${INCIDENT_LABELS[category]}」。`);
      setSeat("");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "課堂情況儲存失敗。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="03・一節一筆"
        title="課堂情況"
        description="選日期與課程後，登記四種課堂事件；可用有效座號或簡短文字記錄。"
      />

      <div className="incident-layout">
        <div className="incident-selector">
          <Panel>
            <label className="field field--large">
              <span>上課日期</span>
              <input type="date" min={SEMESTER.startDate} max={SEMESTER.endDate} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <small>{formatSchoolDate(selectedDate)}</small>
            </label>
          </Panel>

          <Panel>
            <div className="panel-heading"><div><p className="eyebrow">當日課程</p><h3>選擇節次</h3></div><span className="count-bubble">{slots.length}</span></div>
            {slots.length ? (
              <div className="daily-slot-list">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.id}
                    className={activeSlot?.id === slot.id ? "daily-slot is-active" : "daily-slot"}
                    onClick={() => setSlotId(slot.id)}
                  >
                    <span><strong>{slot.period}</strong><small>第 {slot.period} 節</small></span>
                    <span><ClassBadge classId={slot.classId} /><SubjectBadge subjectId={slot.subjectId} /></span>
                    <span>{slot.startTime}–{slot.endTime}</span>
                  </button>
                ))}
              </div>
            ) : selectedHoliday ? (
              <EmptyState icon="✦" title={`國定假日・${selectedHoliday.holidayName}`}>
                當天全部課程都沒有上課，因此不能新增課堂情況；既有紀錄仍會保留在歷程與匯出資料中。
              </EmptyState>
            ) : (
              <EmptyState icon="☀" title="當天沒有排定課程">若為臨時補課，可先到「設定」新增補課。</EmptyState>
            )}
          </Panel>
        </div>

        <div className="incident-workspace">
          <Panel>
            {activeSlot ? (
              <form className="incident-form" onSubmit={submit}>
                <div className="incident-form__heading">
                  <div><p className="eyebrow">{formatSchoolDate(selectedDate)}・第 {activeSlot.period} 節</p><h3>{activeSlot.classId}・{SUBJECTS[activeSlot.subjectId].label}</h3></div>
                  <div className="assignment-context"><ClassBadge classId={activeSlot.classId} /><SubjectBadge subjectId={activeSlot.subjectId} /></div>
                </div>
                <InlineNotice title="請記錄可觀察的事件">
                  只填班級、座號與客觀事實；請勿輸入學生姓名、家庭、健康或輔導等敏感資訊。
                </InlineNotice>

                <fieldset className="choice-fieldset incident-categories">
                  <legend>事件類型</legend>
                  <div className="choice-cards">
                    {(Object.entries(INCIDENT_LABELS) as Array<[IncidentCategory, string]>).map(([value, label]) => (
                      <label key={value} className={category === value ? "is-checked" : ""}>
                        <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                        <span aria-hidden="true">{value === "late" ? "◷" : value === "chatting" ? "●●" : value === "disorder" ? "!" : "□"}</span>
                        <strong>{label}</strong>
                        <small>{snapshot.attentionWeights[value]} 分</small>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="form-grid form-grid--two">
                  <label className="field">
                    <span>座號（選填）</span>
                    <select value={seat} onChange={(event) => setSeat(event.target.value)}>
                      <option value="">不指定座號，改填文字</option>
                      {CLASSES[activeSlot.classId].seats.map((number) => <option key={number} value={number}>{number} 號</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>文字內容{seat ? "（選填）" : "（必填）"}</span>
                    <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={seat ? "例如：第二次提醒後改善" : "例如：後排多人聊天，已口頭提醒"} />
                  </label>
                </div>

                {message ? <p className="form-success" role="status">{message}</p> : null}
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <div className="form-actions"><button className="button button--primary" type="submit" disabled={saving}>{saving ? "儲存中…" : "儲存課堂紀錄"}</button></div>
              </form>
            ) : selectedHoliday ? (
              <EmptyState icon="✦" title="國定假日不建立課堂紀錄">
                「{selectedHoliday.holidayName}」全天沒有上課；請改選其他實際上課日。
              </EmptyState>
            ) : (
              <EmptyState icon="▦" title="請選擇有課的日期">選定課程後，這裡會出現課堂情況表單。</EmptyState>
            )}
          </Panel>

          <Panel>
            <div className="panel-heading"><div><p className="eyebrow">本節歷程</p><h3>已登記事件</h3></div><span className="count-bubble">{existing.length}</span></div>
            {existing.length ? (
              <ol className="incident-history">
                {existing.map((item) => (
                  <li key={item.id}>
                    <span className={`incident-icon incident-icon--${item.category}`} aria-hidden="true">{item.category === "late" ? "◷" : item.category === "chatting" ? "●" : item.category === "disorder" ? "!" : "□"}</span>
                    <div><strong>{item.seatNumber ? `${item.seatNumber} 號・` : ""}{INCIDENT_LABELS[item.category]}</strong><p>{item.note || "未填備註"}</p><small>{formatDateTime(item.recordedAt)}・計 {item.weight} 分</small></div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon="✓" title="本節尚無事件">沒有紀錄也很好；不需要為了填表而新增內容。</EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
