import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { joinAccess } from './join-access.mjs';

export function JoinPanel({ code, cloudMode, origin = location.origin }) {
  const { url, shared } = joinAccess(origin, code, cloudMode);
  const [qr, setQr] = useState(null);
  const [message, setMessage] = useState('');
  const dialog = useRef(null);
  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setMessage('');
    if (shared) QRCode.toDataURL(url, { width: 1024, margin: 4, errorCorrectionLevel: 'M' })
      .then(data => { if (!cancelled) setQr({ url, data }); })
      .catch(() => { if (!cancelled) setMessage('QR 產生失敗，請使用下方網址。'); });
    return () => { cancelled = true; };
  }, [url, shared]);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('已複製學生加入網址。');
    } catch { setMessage('無法自動複製，請選取下方網址手動複製。'); }
  }
  const graphic = qr?.url === url ? <img className="lh-join-qr" src={qr.data} alt={`掃描加入課堂 ${code}`} /> : <p>正在產生 QR…</p>;
  return <section className="lh-join-panel" aria-label="學生加入課堂">
    <div>
      <h2>{shared ? '加入碼' : '本機測試碼'} <b>{code}</b></h2>
      {shared ? <>
        <p>學生可連不同 Wi-Fi；每台裝置都必須能連上本站與雲端服務。</p>
        <div className="lh-row">
          <button type="button" onClick={() => dialog.current.showModal()}>全螢幕加入畫面</button>
          <button type="button" onClick={copyLink}>複製學生網址</button>
          <a href={url} target="_blank" rel="noreferrer">開學生入口</a>
        </div>
        <p className="lh-join-url">{url}</p>
      </> : <>
        <p className="lh-note">此頁僅供本機／設定測試，不能讓學生平板掃碼加入，因此不顯示 QR。</p>
        <p className="lh-note">跨裝置 Teacher Led 須使用已啟用的雲端 HTTPS 課堂；本機課堂不會自動搬到雲端。</p>
        {url && <a href={url} target="_blank" rel="noreferrer">開同一台電腦的學生測試入口</a>}
      </>}
      <p role="status">{message}</p>
    </div>
    {shared && <>
      {graphic}
      <dialog ref={dialog} className="lh-join-dialog" aria-labelledby="lh-join-title">
        <button type="button" autoFocus onClick={() => dialog.current.close()}>關閉加入畫面</button>
        <h2 id="lh-join-title">掃描加入課堂</h2>
        <p className="lh-join-code">加入碼 {code}</p>
        {graphic}
        <p className="lh-join-url">{url}</p>
        <p>不同 Wi-Fi 也可加入；請確認平板能上網。</p>
      </dialog>
    </>}
  </section>;
}
