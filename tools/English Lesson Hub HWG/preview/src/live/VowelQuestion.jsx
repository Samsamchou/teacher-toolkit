import React, { useEffect, useRef, useState } from "react";
import { saveAsset } from "./media.mjs";
import { editVowelPhrase } from "./vowel-phrase.mjs";
import { useMediaResource } from "./useMediaResource.jsx";

function WordImage({ asset, word }) {
  const { url, error } = useMediaResource(asset?.id);
  if (!asset) return <p className="lh-note">尚未加入圖片</p>;
  if (!url) return <p className="lh-note">{error || "載入圖片…"}</p>;
  return <img src={url} alt={word || asset.name} />;
}

export function VowelEditor({ block, onPatch, onChange, onStatus, onError }) {
  const cards = block.vowelWords || [];
  const [uploads, setUploads] = useState({});
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
              <div className="lh-vowel-letters" role="group" aria-label={`${entry.word || `單字 ${wi + 1}`} 的正確字母`}>
                {Array.from(entry.word).map((letter, li) => letter === ' ' ? (
                  <span key={li} className="lh-vowel-space" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    key={li}
                    className={`lh-vowel-key ${entry.targets.includes(li) ? "is-correct" : ""}`}
                    aria-pressed={entry.targets.includes(li)}
                    aria-label={`第 ${li + 1} 個字母 ${letter}`}
                    onClick={() =>
                      updateCard(wi, {
                        targets: entry.targets.includes(li)
                          ? entry.targets.filter((i) => i !== li)
                          : [...entry.targets, li].sort((a, b) => a - b),
                      })
                    }
                  >
                    {letter}
                    {entry.targets.includes(li) && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
              <small>已標記 {entry.targets.length} 個位置</small>
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
          return (
            <article className="lh-vowel-card" key={wi}>
              <div className="lh-vowel-picture">
                <WordImage asset={asset} word={entry.word} />
              </div>
              <div className="lh-vowel-letters" role="group" aria-label={`${entry.word} 的字母`}>
                {Array.from(entry.word).map((letter, li) => {
                  if (letter === ' ') return <span key={li} className="lh-vowel-space" aria-hidden="true" />;
                  const right = selected[wi]?.includes(li);
                  const wrong = flash?.wi === wi && flash.li === li && !flash.correct;
                  return (
                    <button
                      type="button"
                      key={li}
                      disabled={disabled || working || right}
                      className={`lh-vowel-key ${right ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}
                      aria-label={`${entry.word} 第 ${li + 1} 個字母 ${letter}${right ? "，已選對" : wrong ? "，請再試" : ""}`}
                      aria-pressed={Boolean(right)}
                      onClick={() => void choose(wi, li)}
                    >
                      {letter}
                      {(right || wrong) && <span aria-hidden="true">{right ? "✓" : "✕"}</span>}
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
