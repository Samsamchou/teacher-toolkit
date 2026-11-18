import React, { useEffect, useRef, useState } from "react";
import { saveAsset } from "./media.mjs";
import { editVowelPhrase, pruneVowelLinks } from "./vowel-phrase.mjs";
import { vowelCombos, vowelComboLabel } from "./domain.mjs";
import { useMediaResource } from "./useMediaResource.jsx";

// Per letter: combo member (green tile, red letter), the red bar under the group, and the label on its first tile.
function comboMarks(word, groups) {
  const marks = new Map();
  for (const group of groups || []) {
    const first = Math.min(...group), last = Math.max(...group), name = vowelComboLabel(word, group);
    for (let i = first; i <= last; i++)
      marks.set(i, {
        member: group.includes(i),
        name,
        bar: `lh-combo-bar${i === first ? " lh-combo-start" : ""}${i === last ? " lh-combo-end" : ""}`,
        label: i === first ? name : "",
      });
  }
  return marks;
}
// Keep each word's tiles together so a phrase only wraps between words (never "Inter|net").
function byWord(word, render) {
  const out = [];
  let run = [];
  const flush = (key) => {
    if (run.length) out.push(<span className="lh-vowel-run" key={`run-${key}`}>{run}</span>);
    run = [];
  };
  Array.from(word).forEach((letter, li) => {
    if (letter !== " ") return run.push(render(letter, li));
    flush(li);
    out.push(<span key={li} className="lh-vowel-space" aria-hidden="true" />);
  });
  flush("end");
  return out;
}
function comboClass(mark) {
  return mark ? `${mark.bar}${mark.member ? " is-combo" : ""}` : "";
}
function ComboLabel({ mark }) {
  return mark?.label ? <em className="lh-vowel-combo-label">{mark.label}</em> : null;
}

function WordImage({ asset, word }) {
  const { url, error } = useMediaResource(asset?.id);
  if (!asset) return <p className="lh-note">尚未加入圖片</p>;
  if (!url) return <p className="lh-note">{error || "載入圖片…"}</p>;
  return <img src={url} alt={word || asset.name} />;
}

// Read-only result after an assignment vowel question closes (server sends only selected correct letters).
export function VowelResult({ block, result }) {
  return (
    <div className="lh-vowel-result" aria-label="這題你找到的母音拼讀字母">
      {block.vowelWords.map((entry, wi) => {
        const ok = result.correct?.[wi] || [], groups = result.combos?.[wi] || [], marks = comboMarks(entry.word, groups);
        return (
          <div className={`lh-vowel-letters ${groups.length ? "has-combo" : ""}`} key={wi} role="group"
            aria-label={`${entry.word}${groups.length ? `，字母組合 ${groups.map((g) => vowelComboLabel(entry.word, g)).join("、")}` : ""}`}>
            {byWord(entry.word, (letter, li) => (
              <span key={li} className={`lh-vowel-key ${ok.includes(li) ? "is-correct" : ""} ${comboClass(marks.get(li))}`}>
                {letter}
                {ok.includes(li) && <span aria-hidden="true">✓</span>}
                <ComboLabel mark={marks.get(li)} />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function VowelEditor({ block, onPatch, onChange, onStatus, onError }) {
  const cards = block.vowelWords || [];
  const [uploads, setUploads] = useState({});
  const [linking, setLinking] = useState({});
  function finishLink(wi) {
    const entry = cards[wi], picked = [...(linking[wi] || [])].sort((a, b) => a - b);
    if (picked.length > 1)
      updateCard(wi, { links: [...pruneVowelLinks(entry.links, entry.targets).filter((link) => !link.some((i) => picked.includes(i))), picked] });
    setLinking((current) => ({ ...current, [wi]: undefined }));
  }
  function uploadMessage(index, message, failed = false, busy = false) {
    setUploads((current) => ({
      ...current,
      [index]: { message, failed, busy },
    }));
  }
  function updateCard(index, values) {
    onPatch({
      vowelWords: cards.map((entry, i) =>
        i === index ? { ...entry, ...values } : entry,
      ),
    });
  }
  async function upload(index, file) {
    if (!file) return;
    try {
      onError("");
      uploadMessage(index, `正在處理 ${file.name}…`, false, true);
      const asset = await saveAsset(file, {
        onProgress: (message) => uploadMessage(index, message, false, true),
      });
      const blockId = block.id;
      onChange((deck) => ({
        ...deck,
        blocks: deck.blocks.map((current) => {
          if (current.id !== blockId) return current;
          const previous = current.vowelWords[index].imageId;
          return {
            ...current,
            media: [
              ...current.media.filter((item) => item.id !== previous),
              asset,
            ],
            vowelWords: current.vowelWords.map((entry, i) =>
              i === index ? { ...entry, imageId: asset.id } : entry,
            ),
          };
        }),
      }));
      const message = `第 ${index + 1} 張圖片已加入：${asset.name}`;
      uploadMessage(index, message);
      onStatus(message);
    } catch (error) {
      const message = `第 ${index + 1} 張圖片未加入：${error.message}`;
      uploadMessage(index, message, true);
      onError(message);
    }
  }
  return (
    <section className="lh-vowel-editor" aria-label="三字母音題設定">
      <h3>三組單字／片語與正確字母</h3>
      <p className="lh-note">
        每格可輸入單字或片語（例如 by bike），空格會保留為單字間隔，不可點選；
        選一張圖片，再標記正確字母。只調整空格會保留標記，修改字母則需重新標記。
      </p>
      <div className="lh-vowel-grid">
        {cards.map((entry, wi) => {
          const asset = block.media.find((item) => item.id === entry.imageId);
          return (
            <article className="lh-vowel-card" key={wi}>
              <label>
                單字 {wi + 1}
                <input
                  aria-label={`單字 ${wi + 1}`}
                  value={entry.word}
                  maxLength={24}
                  onChange={(event) =>
                    updateCard(wi, editVowelPhrase(entry, event.target.value))
                  }
                />
              </label>
              <div className="lh-vowel-picture">
                <WordImage asset={asset} word={entry.word} />
              </div>
              <label>
                上傳單字 {wi + 1} 的圖片（JPG／PNG／WebP）
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={`上傳單字 ${wi + 1} 的圖片`}
                  disabled={uploads[wi]?.busy}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (file) void upload(wi, file).finally(() => {
                      input.value = "";
                    });
                  }}
                />
              </label>
              {uploads[wi]?.message && (
                <p
                  role={uploads[wi].failed ? "alert" : "status"}
                  className={uploads[wi].failed ? "lh-error" : "lh-upload-status"}
                >
                  {uploads[wi].message}
                </p>
              )}
              {block.media.some((item) => item.kind === "image") && (
                <label>
                  或選擇本頁已有圖片
                  <select
                    aria-label={`單字 ${wi + 1} 的圖片`}
                    value={entry.imageId}
                    onChange={(event) =>
                      updateCard(wi, { imageId: event.target.value })
                    }
                  >
                    <option value="">請選擇圖片</option>
                    {block.media
                      .filter((item) => item.kind === "image")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {(() => {
                const groups = vowelCombos(entry), marks = comboMarks(entry.word, groups), picking = linking[wi];
                return (
                  <>
                    <div className={`lh-vowel-letters ${groups.length ? "has-combo" : ""}`} role="group" aria-label={`${entry.word || `單字 ${wi + 1}`} 的正確字母`}>
                      {byWord(entry.word, (letter, li) => (
                        <button
                          type="button"
                          key={li}
                          className={`lh-vowel-key ${entry.targets.includes(li) ? "is-correct" : ""} ${comboClass(marks.get(li))} ${picking?.includes(li) ? "is-linking" : ""}`}
                          aria-pressed={picking ? picking.includes(li) : entry.targets.includes(li)}
                          aria-label={`第 ${li + 1} 個字母 ${letter}`}
                          disabled={Boolean(picking) && !entry.targets.includes(li)}
                          onClick={() => {
                            if (picking) {
                              setLinking((current) => ({ ...current, [wi]: picking.includes(li) ? picking.filter((i) => i !== li) : [...picking, li] }));
                              return;
                            }
                            const targets = entry.targets.includes(li)
                              ? entry.targets.filter((i) => i !== li)
                              : [...entry.targets, li].sort((a, b) => a - b);
                            updateCard(wi, { targets, ...(entry.links ? { links: pruneVowelLinks(entry.links, targets) } : {}) });
                          }}
                        >
                          {letter}
                          {entry.targets.includes(li) && <span aria-hidden="true">✓</span>}
                          <ComboLabel mark={marks.get(li)} />
                        </button>
                      ))}
                    </div>
                    <small>已標記 {entry.targets.length} 個位置{groups.length ? `；字母組合：${groups.map((g) => vowelComboLabel(entry.word, g)).join("、")}` : ""}</small>
                    <div className="lh-vowel-link-tools">
                      {picking ? (
                        <>
                          <small>點已標記的字母（例如 make 的 a 和 e），再按完成。</small>
                          <button type="button" disabled={picking.length < 2 || new Set(picking.map((i) => entry.word.slice(0, i).split(" ").length)).size > 1} onClick={() => finishLink(wi)}>完成連結</button>
                          <button type="button" onClick={() => setLinking((current) => ({ ...current, [wi]: undefined }))}>取消</button>
                        </>
                      ) : (
                        <button type="button" disabled={entry.targets.length < 2} onClick={() => setLinking((current) => ({ ...current, [wi]: [] }))}>a_e／i_e 連成一組</button>
                      )}
                      {pruneVowelLinks(entry.links, entry.targets).map((link, k) => (
                        <button type="button" key={link.join("-")} className="lh-vowel-link-chip" aria-label={`取消組合 ${vowelComboLabel(entry.word, link)}`}
                          onClick={() => updateCard(wi, { links: pruneVowelLinks(entry.links, entry.targets).filter((_, n) => n !== k) })}>
                          {vowelComboLabel(entry.word, link)} ✕
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function VowelQuestion({
  block,
  progress,
  onTap,
  disabled = false,
  preview = false,
}) {
  const [localSelected, setLocalSelected] = useState([[], [], []]);
  const [working, setWorking] = useState(false);
  const [flash, setFlash] = useState(null);
  const [notice, setNotice] = useState("");
  const timer = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      localStorage.getItem("lh-vowel-reduce-motion") === "1" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  const selected = preview
    ? localSelected
    : progress?.selected || [[], [], []];
  const completedWords = preview
    ? block.vowelWords.map((word, wi) =>
        word.targets.every((i) => selected[wi].includes(i)),
      )
    : progress?.completedWords || [false, false, false];
  const combos = preview
    ? block.vowelWords.map((word, wi) =>
        vowelCombos(word).filter((group) => group.every((i) => selected[wi].includes(i))),
      )
    : progress?.combos || [[], [], []];
  async function choose(wi, li) {
    if (disabled || working || selected[wi]?.includes(li)) return;
    clearTimeout(timer.current);
    setWorking(true);
    setNotice("");
    try {
      let correct;
      if (preview) {
        correct = block.vowelWords[wi].targets.includes(li);
        if (correct)
          setLocalSelected((current) =>
            current.map((row, i) => (i === wi ? [...row, li] : row)),
          );
      } else {
        correct = (await onTap(wi, li)).correct;
      }
      setFlash({ wi, li, correct });
      setNotice(correct ? "✓ 找到了！" : "✕ 再試一次。");
      timer.current = setTimeout(() => setFlash(null), 1000);
    } catch (error) {
      setNotice(`連線中斷，請重試：${error.message}`);
    } finally {
      setWorking(false);
    }
  }
  return (
    <section
      className={`lh-vowel-question ${reduceMotion ? "lh-vowel-reduce" : ""}`}
      aria-label="點選三個單字的母音拼讀字母"
    >
      <h2>{block.title}</h2>
      {block.text && <p className="lh-vowel-prompt">{block.text}</p>}
      <div className="lh-row">
        <p>點選每個單字的母音拼讀字母；三個都完成就會自動交卷。</p>
        <button
          type="button"
          aria-pressed={reduceMotion}
          onClick={() => {
            const next = !reduceMotion;
            setReduceMotion(next);
            localStorage.setItem("lh-vowel-reduce-motion", next ? "1" : "0");
          }}
        >
          減少動畫：{reduceMotion ? "開" : "關"}
        </button>
      </div>
      <div className="lh-vowel-grid">
        {block.vowelWords.map((entry, wi) => {
          const asset = block.media.find((item) => item.id === entry.imageId);
          const marks = comboMarks(entry.word, combos[wi]);
          return (
            <article className="lh-vowel-card" key={wi}>
              <div className="lh-vowel-picture">
                <WordImage asset={asset} word={entry.word} />
              </div>
              <div className={`lh-vowel-letters ${combos[wi]?.length ? "has-combo" : ""}`} role="group" aria-label={`${entry.word} 的字母`}>
                {byWord(entry.word, (letter, li) => {
                  const right = selected[wi]?.includes(li);
                  const wrong = flash?.wi === wi && flash.li === li && !flash.correct;
                  return (
                    <button
                      type="button"
                      key={li}
                      disabled={disabled || working || right}
                      className={`lh-vowel-key ${right ? "is-correct" : ""} ${wrong ? "is-wrong" : ""} ${comboClass(marks.get(li))}`}
                      aria-label={`${entry.word} 第 ${li + 1} 個字母 ${letter}${right ? "，已選對" : wrong ? "，請再試" : ""}${marks.get(li)?.member ? `，字母組合 ${marks.get(li).name}` : ""}`}
                      aria-pressed={Boolean(right)}
                      onClick={() => void choose(wi, li)}
                    >
                      {letter}
                      {(right || wrong) && <span aria-hidden="true">{right ? "✓" : "✕"}</span>}
                      <ComboLabel mark={marks.get(li)} />
                    </button>
                  );
                })}
              </div>
              {completedWords[wi] && <strong className="lh-vowel-done">✓ 這組單字／片語完成</strong>}
            </article>
          );
        })}
      </div>
      <p role="status" className="lh-vowel-notice">{working ? "正在核對字母…" : notice}</p>
    </section>
  );
}
