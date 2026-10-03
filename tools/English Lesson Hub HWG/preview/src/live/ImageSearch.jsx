import React, { useState } from "react";
import { saveAsset } from "./media.mjs";
import { cloudMode,callCloudService } from "./transport.mjs";
export function ImageSearch({ onAdd, halfSize = true, inline = false }) {
  const [q, setQ] = useState(""),
    [hits, setHits] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function request(params) {
    if (cloudMode) return callCloudService('liveImageSearchV2',{input:params});
    const r = await fetch("/api/live-images?" + new URLSearchParams(params));
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  async function search() {
    setBusy(true);
    try {
      const r = await request({ query: q });
      setHits(r.hits);
      setMessage("已啟用 SafeSearch；仍請教師檢查圖片是否適合學生。");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function add(h) {
    if (
      !confirm(
        "請確認已閱讀來源頁與授權，並確認圖片適合課堂使用。是否下載到教材？",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await request({ action: "download", id: h.id,licenseConfirmed:true });
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const asset = await saveAsset(
        new File([bytes], `pixabay-${h.id}`, { type: r.mime }),
        {halfSize,source:{...r.source,licenseConfirmed:true}},
      );
      onAdd({ ...asset, source: r.source });
      setMessage("已下載並壓縮至教材，不使用外站熱鏈。");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const Wrapper = inline ? 'div' : 'details';
  return (
    <Wrapper>
      {!inline && <summary>搜尋網路圖片（SafeSearch）</summary>}
      <p>圖片搜尋由 <a href="https://pixabay.com/" target="_blank" rel="noreferrer">Pixabay</a> 提供。</p>
      <input
        aria-label="圖片搜尋字詞"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={80}
      />
      <button disabled={busy} onClick={search}>
        搜尋圖片
      </button>
      <p role="status">{message}</p>
      <div className="lh-row">
        {hits.map((h) => (
          <section key={h.id}>
            <img src={h.preview} alt={h.tags} width="120" loading="lazy" />
            <p>{h.author}</p>
            <a href={h.page} target="_blank" rel="noreferrer">
              來源頁
            </a>{" "}
            ·{" "}
            <a
              href="https://pixabay.com/service/license-summary/"
              target="_blank"
              rel="noreferrer"
            >
              授權
            </a>
            <button disabled={busy} onClick={() => add(h)}>
              確認並加入
            </button>
          </section>
        ))}
      </div>
    </Wrapper>
  );
}
