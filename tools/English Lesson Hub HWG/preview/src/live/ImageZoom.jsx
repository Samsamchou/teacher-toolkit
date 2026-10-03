import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
export function ImageZoom({ url, name }) {
  const dialog = useRef(null), trigger = useRef(null);
  return <>
    <button ref={trigger} className="lh-image-thumb" aria-label={`放大圖片：${name}`} onClick={() => dialog.current.showModal()}>
      <img src={url} alt={name} /><span>點圖放大 ⤢</span>
    </button>
    {createPortal(<dialog className="lh-image-dialog" ref={dialog} aria-label={`放大圖片：${name}`}
      onClose={() => trigger.current?.focus()} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <button autoFocus aria-label="關閉放大圖片" className="lh-image-close" onClick={() => dialog.current.close()}>×</button>
      <img src={url} alt={name} />
    </dialog>, document.body)}
  </>;
}
