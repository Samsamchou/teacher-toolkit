import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { CLASS_IDS, CLASSES, SEMESTER, SITE, SUBJECTS, WEEKLY_SCHEDULE } from "../data/semester";
import { InlineNotice, Modal } from "./Common";

function TeacherLogin({ onClose }: { onClose(): void }) {
  const { mode, signIn } = useAuth();
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(pin)) {
      setError("請輸入完整的 6 位數通行碼。");
      return;
    }
    try {
      setSubmitting(true);
      await signIn(pin, remember);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法登入，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="進入教師後臺"
      description="此入口僅供授課教師使用。"
      onClose={onClose}
      labelledBy="teacher-login-title"
    >
      <form className="login-form" onSubmit={submit}>
        {mode === "demo" ? (
          <InlineNotice tone="warning" title="本機展示模式">
            任意 6 位數都能進入，資料只存在這台裝置的瀏覽器。這不是正式安全驗證，請勿填入真實學生紀錄。
          </InlineNotice>
        ) : (
          <InlineNotice title="Firebase 驗證模式">
            通行碼會送往後端驗證；本頁不會把通行碼寫入原始碼或瀏覽器資料庫。
          </InlineNotice>
        )}

        <label className="field field--large">
          <span>6 位數通行碼</span>
          <input
            ref={inputRef}
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]{6}"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-describedby="pin-help"
            aria-invalid={Boolean(error)}
            placeholder="● ● ● ● ● ●"
          />
          <small id="pin-help">請勿在共用螢幕前讓他人看見通行碼。</small>
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>
            <strong>這是我的私人裝置</strong>
            <small>保留登入 7 天；未勾選時，閒置 30 分鐘會登出。</small>
          </span>
        </label>

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <div className="modal-actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? "驗證中…" : "進入後臺"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PublicHome() {
  const { mode } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const previewSlots = WEEKLY_SCHEDULE.slice(0, 3);

  return (
    <div className="public-home">
      <header className="public-header">
        <a className="brand" href="#top" aria-label={`${SITE.name}首頁`}>
          <span className="brand__mark" aria-hidden="true">好</span>
          <span>
            <strong>{SITE.name}</strong>
            <small>Homeworkclass Template</small>
          </span>
        </a>
        <button className="button button--dark" type="button" onClick={() => setLoginOpen(true)}>
          <span aria-hidden="true">🔐</span> 教師後臺
        </button>
      </header>

      {mode === "demo" ? (
        <div className="demo-ribbon" role="status">
          <strong>本機展示模式</strong>
          <span>任意 6 位數可進入；只存此瀏覽器，不可填真實學生紀錄。</span>
        </div>
      ) : null}

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">一週課表，就是你的工作入口</p>
            <h1>
              每一份作業、每一次補交，
              <span>清楚看見，不再漏接。</span>
            </h1>
            <p className="hero-lead">
              以 {WEEKLY_SCHEDULE.length} 節範例週課表快速登記 {Object.keys(SUBJECTS).length} 種科目，集中掌握 {CLASS_IDS.length} 個範例班級的作業與課堂情況。
            </p>
            <div className="hero-actions">
              <button className="button button--primary button--large" type="button" onClick={() => setLoginOpen(true)}>
                開始今日登記 <span aria-hidden="true">→</span>
              </button>
              <span className="privacy-promise"><span aria-hidden="true">◉</span> 只使用班級與座號，不保存姓名</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="網站功能預覽">
            <div className="preview-window">
              <div className="preview-window__bar">
                <span /><span /><span />
                <small>本週課表</small>
              </div>
              <div className="preview-date">
                <span>9 月第 1 週</span>
                <strong>今天有 4 節課</strong>
              </div>
              <div className="preview-lessons">
                {previewSlots.map((slot, index) => {
                  const meta = CLASSES[slot.classId];
                  return (
                    <div className="preview-lesson" key={slot.id} style={{ "--accent": meta.accent } as CSSProperties}>
                      <span className="preview-lesson__number">{slot.period}</span>
                      <span><strong>{meta.shortLabel}・{SUBJECTS[slot.subjectId].label}</strong><small>{slot.startTime} 開始</small></span>
                      <span aria-hidden="true">＋</span>
                    </div>
                  );
                })}
              </div>
              <div className="preview-summary">
                <span><strong>5</strong><small>待補交</small></span>
                <span><strong>2</strong><small>需關注</small></span>
                <span><strong>{WEEKLY_SCHEDULE.length}</strong><small>範例課次</small></span>
              </div>
            </div>
            <span className="spark spark--one" aria-hidden="true">✦</span>
            <span className="spark spark--two" aria-hidden="true">●</span>
          </div>
        </section>

        <section className="class-strip" aria-labelledby="class-strip-title">
          <div>
            <p className="eyebrow">{CLASS_IDS.length} 班一眼辨識</p>
            <h2 id="class-strip-title">顏色是提示，班名與圖示才是依據</h2>
          </div>
          <div className="class-strip__items">
            {CLASS_IDS.map((classId) => (
              <span
                key={classId}
                style={{ "--accent": CLASSES[classId].accent, "--soft": CLASSES[classId].accentSoft } as CSSProperties}
              >
                <i aria-hidden="true" /> {CLASSES[classId].shortLabel}
              </span>
            ))}
          </div>
        </section>

        <section className="feature-section" aria-labelledby="features-title">
          <div className="section-intro">
            <p className="eyebrow">從上課到週末整理</p>
            <h2 id="features-title">每天三步驟，週末一張表</h2>
          </div>
          <div className="feature-grid">
            <article><span aria-hidden="true">01</span><h3>點課表，出作業</h3><p>日期、節次、班級與科目自動帶入，只要選類型、填內容。</p></article>
            <article><span aria-hidden="true">02</span><h3>點座號，記繳交</h3><p>保留請假、無故、當天完成與補交日期的完整變化歷程。</p></article>
            <article><span aria-hidden="true">03</span><h3>課堂事件隨手記</h3><p>依日期與節次登記遲到、聊天、秩序或未帶用品。</p></article>
            <article><span aria-hidden="true">04</span><h3>週末清單不漏人</h3><p>依班級、座號與科目篩選，匯出未補交與需關注摘要。</p></article>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <strong>{SITE.name}</strong>
        <span>{SEMESTER.label}・{SEMESTER.timezone}</span>
      </footer>

      {loginOpen ? <TeacherLogin onClose={() => setLoginOpen(false)} /> : null}
    </div>
  );
}
