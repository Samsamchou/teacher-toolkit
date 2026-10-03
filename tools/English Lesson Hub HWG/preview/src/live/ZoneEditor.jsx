import React, { useState } from 'react';
import { useMediaResource } from './useMediaResource.jsx';

export function ZoneEditor({ block, patch }) {
  const [selected, setSelected] = useState(0);
  const { url } = useMediaResource(block.media.find(a => a.kind === 'image')?.id);
  const index = Math.min(selected, Math.max(0, block.zones.length - 1));
  const zone = block.zones[index];
  function resize(key, value) {
    const z = { ...zone, [key]: value };
    z.x = Math.min(z.x, 1 - z.w); z.y = Math.min(z.y, 1 - z.h);
    patch({ zones: block.zones.map((v, i) => i === index ? z : v) });
  }
  return <section className="lh-zone-editor" aria-label="圖片位置編輯器">
    <h4>圖片與作答位置</h4><p>點選區域，再調整位置與大小；框線僅供教師設定。</p>
    <div className="lh-zone-canvas">{url ? <img src={url} alt="題目底圖" /> : <p>請先用「加入圖片」上傳底圖</p>}
      {block.zones.map((z, i) => <button key={i} aria-label={`編輯位置 ${i + 1}`} aria-pressed={i === index} style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, width: `${z.w * 100}%`, height: `${z.h * 100}%` }} onClick={() => setSelected(i)}>{i + 1}</button>)}
    </div>
    {zone && <div className="lh-zone-ranges">{[['x', '水平位置'], ['y', '垂直位置'], ['w', '寬度'], ['h', '高度']].map(([key, label]) => <label key={key}>{label}：{Math.round(zone[key] * 100)}%<input type="range" min={key === 'w' || key === 'h' ? 0.02 : 0} max={key === 'x' ? 1 - zone.w : key === 'y' ? 1 - zone.h : 1} step="0.01" value={zone[key]} onChange={e => resize(key, Number(e.target.value))} /></label>)}</div>}
    <button onClick={() => { patch({ zones: [...block.zones, { x: 0.2, y: 0.2, w: 0.2, h: 0.2 }] }); setSelected(block.zones.length); }}>＋ 新增作答位置</button>
    <details><summary>進階：精確座標</summary><label>圖片位置：每行 x,y,寬,高（0–1 比例）<textarea value={block.zones.map(z => [z.x, z.y, z.w, z.h].join(',')).join('\n')} onChange={e => patch({ zones: e.target.value.split('\n').map(s => { const [x, y, w, h] = s.split(',').map(Number); return { x, y, w, h }; }) })} /></label></details>
  </section>;
}
