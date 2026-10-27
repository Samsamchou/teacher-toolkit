import { CheckCircle2, EyeOff, Eye, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ALPHABET, FIXED_SETS, defaultSlotEvery, describeSet } from "./questionSets.js";

const EMPTY_FORM = { id: "", name: "", letters: [], order: "sequential", slotEvery: 3, active: true };

// Teacher page for building question sets. The five fixed sets are shown
// read-only; teacher-made sets can be created, edited, hidden and shown again.
export default function QuestionSetEditor({ password, call, readableError, onAuthError }) {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [everyTouched, setEveryTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await call("getTeacherQuestionSets", { password });
      setSets(response.sets || []);
    } catch (error) {
      onAuthError(error);
    } finally {
      setLoading(false);
    }
  }, [call, onAuthError, password]);

  useEffect(() => {
    load();
  }, [load]);

  const setLetters = (letters) => {
    const unique = [...new Set(letters)].sort();
    setForm((current) => ({
      ...current,
      letters: unique,
      slotEvery: everyTouched ? current.slotEvery : defaultSlotEvery(unique.length || 1),
    }));
  };

  const toggleLetter = (letter) =>
    setLetters(
      form.letters.includes(letter)
        ? form.letters.filter((item) => item !== letter)
        : [...form.letters, letter],
    );

  const startNew = () => {
    setEveryTouched(false);
    setMessage("");
    setForm({ ...EMPTY_FORM });
  };

  const startEdit = (set) => {
    setEveryTouched(true);
    setMessage("");
    setForm({ ...set });
  };

  const save = async (override = {}) => {
    const data = { ...form, ...override };
    if (!data.name.trim()) {
      setMessage("請輸入題組名稱。");
      return;
    }
    if (!data.letters.length) {
      setMessage("請至少選一個字母。");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await call("saveQuestionSet", { password, set: data });
      setForm(null);
      setMessage(`已儲存「${data.name.trim()}」。`);
      await load();
    } catch (error) {
      setMessage(readableError(error));
      onAuthError(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (set) => {
    setSaving(true);
    try {
      await call("saveQuestionSet", { password, set: { ...set, active: !set.active } });
      await load();
    } catch (error) {
      setMessage(readableError(error));
      onAuthError(error);
    } finally {
      setSaving(false);
    }
  };

  const count = form?.letters.length || 0;

  return (
    <div className="set-editor">
      <div className="set-editor-head">
        <div>
          <h2>出題設定</h2>
          <p>5 個固定題組不能修改；自訂題組可新增、修改、停用（停用後學生首頁看不到，但紀錄保留）。</p>
        </div>
        {!form && (
          <button className="primary-button" type="button" onClick={startNew}>
            <Plus size={18} /> 新增題組
          </button>
        )}
      </div>

      {message && <p className="set-editor-message">{message}</p>}

      {form && (
        <form
          className="set-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label className="field-label" htmlFor="set-name">
            題組名稱（學生首頁會看到）
          </label>
          <input
            id="set-name"
            className="text-input"
            maxLength={30}
            placeholder="例如：b d p q 易混字母"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />

          <div className="field-label">
            選字母（已選 {count} 個）
            <span className="quick-picks">
              <button type="button" onClick={() => setLetters(ALPHABET)}>全部</button>
              <button type="button" onClick={() => setLetters(ALPHABET.slice(0, 13))}>A–M</button>
              <button type="button" onClick={() => setLetters(ALPHABET.slice(13))}>N–Z</button>
              <button type="button" onClick={() => setLetters([])}>清除</button>
            </span>
          </div>
          <div className="letter-picker">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                className={form.letters.includes(letter) ? "picked" : ""}
                aria-pressed={form.letters.includes(letter)}
                onClick={() => toggleLetter(letter)}
              >
                {letter}
                <small>{letter.toLowerCase()}</small>
              </button>
            ))}
          </div>

          <div className="set-form-row">
            <div>
              <span className="field-label">出題順序</span>
              <div className="segmented">
                {[
                  ["sequential", "依序（A→Z）"],
                  ["random", "亂序"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={form.order === value ? "active" : ""}
                    onClick={() => setForm({ ...form, order: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="slot-every">
                每寫對幾題拉一回拉霸（每回 3 拉）
              </label>
              <input
                id="slot-every"
                className="text-input every-input"
                type="number"
                min={1}
                max={Math.max(1, count)}
                value={form.slotEvery}
                onChange={(event) => {
                  setEveryTouched(true);
                  setForm({ ...form, slotEvery: Number(event.target.value) || 1 });
                }}
              />
            </div>
          </div>

          {count > 0 && (
            <p className="set-preview">
              預覽：{describeSet(form)}；出題順序{" "}
              {form.order === "random" ? "每次重新打亂" : form.letters.join(" → ")}
            </p>
          )}

          <div className="set-form-actions">
            <button className="secondary-button" type="button" onClick={() => setForm(null)} disabled={saving}>
              <X size={18} /> 取消
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              儲存題組
            </button>
          </div>
        </form>
      )}

      <div className="set-list">
        {FIXED_SETS.map((set) => (
          <div className="set-row fixed" key={set.id}>
            <CheckCircle2 size={20} />
            <div>
              <strong>{set.name}</strong>
              <small>{describeSet(set)}・固定題組</small>
            </div>
          </div>
        ))}
        {loading ? (
          <p className="set-loading">
            <Loader2 className="spin" size={16} /> 載入自訂題組…
          </p>
        ) : (
          sets.map((set) => (
            <div className={`set-row ${set.active ? "" : "inactive"}`} key={set.id}>
              {set.active ? <Eye size={20} /> : <EyeOff size={20} />}
              <div>
                <strong>{set.name}</strong>
                <small>
                  {describeSet(set)}・{set.letters.join(" ")}
                  {set.active ? "" : "・已停用"}
                </small>
              </div>
              <div className="set-row-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(set)} disabled={saving}>
                  <Pencil size={16} /> 修改
                </button>
                <button type="button" className="secondary-button" onClick={() => toggleActive(set)} disabled={saving}>
                  {set.active ? <EyeOff size={16} /> : <Eye size={16} />}
                  {set.active ? "停用" : "啟用"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
