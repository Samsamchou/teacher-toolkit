import React, { useState, useRef, useEffect } from "react";
import { assetUrl } from "./media.mjs";
import {useMediaResource} from './useMediaResource.jsx';
function CanvasImage({ asset }) {
  const {url,error}=useMediaResource(asset?.id);
  if(!url)return <span>{error||'載入圖片…'}</span>;
  return (
    <img
      alt={asset?.name || "圖片"}
      src={url}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
      }}
    />
  );
}
export function CanvasObjects({ objects, media, onSelect, onMove, selected }) {
  const ref = useRef(),
    drag = useRef();
  if (!objects.length && !onSelect) return null;
  return (
    <div
      ref={ref}
      className="lh-object-canvas"
      aria-label="自由畫布"
      style={{
        position: "relative",
        aspectRatio: "16/9",
        background: "#fff",
        border: "1px dashed #b1a0ef",
        overflow: "hidden",
      }}
    >
      {objects.map((o) => (
        <div
          key={o.id}
          tabIndex={onSelect ? 0 : undefined}
          role={onSelect ? "button" : undefined}
          aria-label={onSelect ? `畫布物件 ${o.text || o.kind}` : undefined}
          onClick={() => onSelect?.(o.id)}
          onKeyDown={(e) => {
            if (
              onMove &&
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              onMove(o.id, {
                x: Math.max(
                  0,
                  Math.min(
                    100 - o.w,
                    o.x +
                      (e.key === "ArrowLeft"
                        ? -1
                        : e.key === "ArrowRight"
                          ? 1
                          : 0),
                  ),
                ),
                y: Math.max(
                  0,
                  Math.min(
                    100 - o.h,
                    o.y +
                      (e.key === "ArrowUp"
                        ? -1
                        : e.key === "ArrowDown"
                          ? 1
                          : 0),
                  ),
                ),
              });
            }
          }}
          onPointerDown={(e) => {
            if (!onMove) return;
            onSelect(o.id);
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              id: o.id,
              x: e.clientX,
              y: e.clientY,
              ox: o.x,
              oy: o.y,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== o.id) return;
            const r = ref.current.getBoundingClientRect();
            onMove(o.id, {
              x: Math.max(
                0,
                Math.min(100 - o.w, d.ox + ((e.clientX - d.x) / r.width) * 100),
              ),
              y: Math.max(
                0,
                Math.min(
                  100 - o.h,
                  d.oy + ((e.clientY - d.y) / r.height) * 100,
                ),
              ),
            });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          style={{
            position: "absolute",
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: `${o.w}%`,
            height: `${o.h}%`,
            zIndex: o.z || 0,
            transform: `rotate(${o.rotation || 0}deg)`,
            fontSize: o.size || 32,
            fontWeight: o.bold ? "bold" : "normal",
            fontFamily:
              o.font === "kai"
                ? "DFKai-SB, BiauKai, KaiTi, serif"
                : "Comic Relief, sans-serif",
            color: o.color || "#17324d",
            textAlign: o.align || "left",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            outline: selected === o.id ? "2px solid #7b4fe7" : "none",
            touchAction: onMove ? "none" : "auto",
            cursor: onMove ? "move" : "default",
          }}
        >
          {o.kind === "image" ? (
            <CanvasImage asset={media.find((a) => a.id === o.assetId)} />
          ) : (
            o.text
          )}
        </div>
      ))}
    </div>
  );
}
export function AdvancedEditor({ block, onChange }) {
  const [selected, setSelected] = useState("");
  const objects = block.objects || [],
    current = objects.find((o) => o.id === selected);
  function patch(id, value) {
    onChange({
      objects: objects.map((o) => (o.id === id ? { ...o, ...value } : o)),
    });
  }
  function add(kind, assetId) {
    const o = {
      id: crypto.randomUUID(),
      kind,
      assetId: assetId || "",
      text: kind === "text" ? "新文字" : "",
      x: 10,
      y: 10,
      w: 40,
      h: 20,
      size: 32,
      font: block.font,
      color: block.color,
      z: objects.length,
    };
    onChange({ objects: [...objects, o] });
    setSelected(o.id);
  }
  return (
    <details>
      <summary>進階文字與自由畫布</summary>
      <div className="lh-row">
        <label>
          <input
            type="checkbox"
            checked={!!block.bold}
            onChange={(e) => onChange({ bold: e.target.checked })}
          />
          粗體
        </label>
        <label>
          <input
            type="checkbox"
            checked={!!block.bullets}
            onChange={(e) => onChange({ bullets: e.target.checked })}
          />
          項目符號
        </label>
        <label>
          對齊
          <select
            value={block.align || "left"}
            onChange={(e) => onChange({ align: e.target.value })}
          >
            <option value="left">靠左</option>
            <option value="center">置中</option>
            <option value="right">靠右</option>
          </select>
        </label>
        <label>
          行距
          <input
            type="number"
            min="1"
            max="3"
            step="0.1"
            value={block.lineHeight || 1.5}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          />
        </label>
        <button onClick={() => add("text")}>加入畫布文字</button>
        <select
          aria-label="加入画布圖片"
          value=""
          onChange={(e) => {
            if (e.target.value) add("image", e.target.value);
          }}
        >
          <option value="">加入已上傳圖片…</option>
          {block.media
            .filter((a) => a.kind === "image")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      </div>
      <CanvasObjects
        objects={objects}
        media={block.media}
        selected={selected}
        onSelect={setSelected}
        onMove={patch}
      />
      {current && (
        <div className="lh-form">
          <label>
            物件文字
            <textarea
              aria-label="物件文字"
              value={current.text}
              onChange={(e) => patch(current.id, { text: e.target.value })}
            />
          </label>
          <div className="lh-row">
            {[
              ["x", "水平位置", 0, 100],
              ["y", "垂直位置", 0, 100],
              ["w", "寬度", 5, 100],
              ["h", "高度", 5, 100],
              ["size", "字級", 12, 100],
              ["rotation", "旋轉", -180, 180],
              ["z", "圖層", 0, 50],
            ].map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={current[key] || 0}
                  onChange={(e) =>
                    patch(current.id, {
                      [key]: Math.min(
                        max,
                        Math.max(min, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            ))}
            <label>
              物件字型
              <select
                value={current.font}
                onChange={(e) => patch(current.id, { font: e.target.value })}
              >
                <option value="comic">Comic Relief</option>
                <option value="kai">楷體</option>
              </select>
            </label>
            <label>
              物件色彩
              <input
                type="color"
                value={current.color}
                onChange={(e) => patch(current.id, { color: e.target.value })}
              />
            </label>
            <button
              onClick={() =>
                onChange({
                  objects: objects.filter((o) => o.id !== current.id),
                })
              }
            >
              刪除物件
            </button>
          </div>
        </div>
      )}
      <p>拖曳或方向鍵移動物件；百分比座標讓師生畫布同步縮放。</p>
    </details>
  );
}
