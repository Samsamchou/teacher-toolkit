import React, { useEffect, useRef, useState } from "react";
import { JoinPanel } from './JoinPanel.jsx';
import { createSeedLessons } from "../data/lesson-data.js";
import { TYPES, newBlock, copy, embedUrl, publicBlock } from "./domain.mjs";
import { canRetryResponse, requiresMastery } from './mastery.mjs';
import { AnnotationSurface } from './AnnotationSurface.jsx';
import { HorizontalOrder } from './HorizontalOrder.jsx';
import { ReviewReport, ReportHistory, correctText } from './ReviewReport.jsx';
import { answerStatus, answerText, reviewLabels } from './review.mjs';
import { saveAsset, assetUrl } from "./media.mjs";
import {
  api,
  cloudMode,
  loginTeacher,
  callCloudService,
} from "./transport.mjs";
import { useMediaResource } from "./useMediaResource.jsx";
import { AudioAnswer } from "./AudioAnswer.jsx";
import { AdvancedEditor, CanvasObjects } from "./AdvancedEditor.jsx";
import { SlideEditor, SlideCanvasView, CanvasQuestionStem } from './SlideCanvas.jsx';
import { applyTheme, canvasFor, mediaElement, restoreOriginal, slideToQuestion } from './slide-canvas.mjs';
import { ImageSearch } from "./ImageSearch.jsx";
import { RewardGames } from "./RewardGames.jsx";
import { TeacherMusic } from './TeacherMusic.jsx';
import { useStudentFeedbackAudio } from './StudentFeedbackAudio.jsx';
import { VowelEditor, VowelQuestion } from "./VowelQuestion.jsx";
import { AnswerEditor } from "./AnswerEditor.jsx";
import { ZoneEditor } from "./ZoneEditor.jsx";
import { parityBlock, convertBlock, inlineTypes, textLength, publicParity, solutionText } from './parity.mjs';
import { ParityEditor } from './ParityEditor.jsx';
import { ParityQuestion } from './ParityQuestion.jsx';
import { videoSource } from './video.mjs';
import { VideoPlayer } from './VideoPlayer.jsx';
import { UploadedVideo } from './UploadedVideo.jsx';
import { REWARD_GAMES } from "./rewards.mjs";
import { ImageZoom } from './ImageZoom.jsx';
import { FocusScreen } from './FocusScreen.jsx';
import { ImageUpgrade } from './ImageUpgrade.jsx';
import "./live.css";
import "./studio.css";
import './space.css';
import './review.css';
import SpaceTheme from './SpaceTheme.jsx';
import { CourseName } from './CourseName.jsx';
import { courseName } from './course-name.mjs';
import './compact.css';

const params = new URLSearchParams(location.search);
const student = params.has("join");
const questionMinutes = [0.5, 1, 1.5, 2, 3, 5, 10, 15];
function Media({ asset, zoom = false }) {
  const { url, error, refresh } = useMediaResource(asset.id);
  const [retryError, setRetryError] = useState("");
  if (!url)
    return (
      <div className="lh-note">
        <p>
          {asset.name}：{retryError || error || "載入素材…"}
        </p>
        {!student && cloudMode && error.includes("轉檔失敗") && (
          <button
            onClick={async () => {
              try {
                await callCloudService("liveMediaV2", {
                  action: "retry",
                  id: asset.id,
                });
                setRetryError("");
                refresh();
              } catch (e) {
                setRetryError(e.message);
              }
            }}
          >
            重試影片轉檔
          </button>
        )}
      </div>
    );
  if (asset.kind === "image") return zoom ? <ImageZoom url={url} name={asset.name} /> : <img src={url} alt={asset.name} />;
  if (asset.kind === "audio") return <audio controls src={url} />;
  return <video controls playsInline src={url} />;
}
function Ink({ value = [], onChange, disabled = false }) {
  const ref = useRef();
  const drawing = useRef(false);
  const lines = useRef(value);
  useEffect(() => {
    lines.current = value;
  }, [value]);
  const point = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1000, ((e.clientX - r.left) / r.width) * 1000)),
      Math.max(0, Math.min(600, ((e.clientY - r.top) / r.height) * 600)),
    ];
  };
  return (
    <div className="lh-ink">
      <svg
        ref={ref}
        viewBox="0 0 1000 600"
        aria-label="繪圖畫布"
        onPointerDown={(e) => {
          if (disabled) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          lines.current = [...lines.current, [point(e)]];
          onChange(lines.current);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || disabled) return;
          const next = copy(lines.current);
          if (next.flat().length > 2500) return;
          next[next.length - 1].push(point(e));
          lines.current = next;
          onChange(next);
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      >
        {value.map((line, i) => (
          <polyline
            key={i}
            points={(line.points || line).map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={line.color || '#6d46db'}
            strokeWidth={line.width || 5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {!disabled && (
        <div className="lh-row">
          <button onClick={() => onChange(value.slice(0, -1))}>復原一筆</button>
          <button onClick={() => onChange([])}>清除</button>
        </div>
      )}
    </div>
  );
}
function BlockContent({ block, room, onControl, onPlaybackChange }) {
  if (block.type === 'slide') return <SlideCanvasView block={block} room={room} onControl={onControl} onPlaybackChange={onPlaybackChange} />;
  if (block.questionCanvas) return <CanvasQuestionStem block={block} />;
  if (block.type !== 'slide' && block.type !== 'vowel') {
    const pictures = (block.media || []).filter(a => a.kind === 'image');
    return <section className="lh-canvas lh-question-stem lh-split-stem" style={{color:block.color,fontSize:block.fontSize}}>
      {pictures.length > 0 && <div className="lh-stem-pictures">{pictures.map(a => <div key={a.id} data-annotation-anchor={`media-${a.id}`}><Media asset={a} zoom /></div>)}</div>}
      <div className="lh-stem-copy"><h2 data-annotation-anchor="title">{block.title}</h2>
        {block.text && <p data-annotation-anchor="prompt">{block.text}</p>}
        <CanvasObjects objects={block.objects || []} media={block.media || []}/>
        {(block.media || []).filter(a => a.kind !== 'image').map(a => <Media key={a.id} asset={a}/>)}</div>
    </section>;
  }
  let safeEmbed='',embedError='';
  if(block.type==='slide'&&block.embed)try{safeEmbed=embedUrl(block.embed);}catch(e){embedError=e.message;}
  return (
    <div
      className={`lh-canvas ${block.type === 'slide' ? 'lh-slide-canvas' : 'lh-question-stem'} ${block.font === "kai" ? "lh-kai" : ""}`}
      style={{ color: block.color, fontSize: block.fontSize }}
    >
      <h2 data-annotation-anchor="title">{block.title}</h2>
      {block.type!=='slide'&&block.text&&<p data-annotation-anchor="prompt">{block.text}</p>}
      {block.type === "slide" && (
        <p data-annotation-anchor="slide-text"
          style={{
            whiteSpace: "pre-wrap",
            fontWeight: block.bold ? "bold" : "normal",
            textAlign: block.align || "left",
            lineHeight: block.lineHeight || 1.5,
          }}
        >
          {block.bullets
            ? block.text
                .split("\n")
                .map((t) => "• " + t)
                .join("\n")
            : block.text}
        </p>
      )}
      {block.type !== "vowel" && (
        <>
          <CanvasObjects objects={block.objects || []} media={block.media || []} />
          <div className={`lh-media lh-${block.layout}`}>
            {block.media?.filter(a => !(block.modelVersion === 3 && a.id === block.background?.assetId) && !(block.type==='slide'&&block.syncVideoId&&a.kind==='video'&&a.id!==block.syncVideoId)).map((a) => (
              <div
                key={a.id}
                data-annotation-anchor={`media-${a.id}`}
                style={
                  block.layout === "free"
                    ? {
                        position: "relative",
                        left: `${a.x || 0}%`,
                        width: `${a.width || 80}%`,
                      }
                    : {}
                }
              >
                {block.type==='slide'&&block.syncVideoId===a.id ? <UploadedVideo key={block.id+a.id} asset={a} room={room} onControl={onControl}/> : <Media asset={a} />}
              </div>
            ))}
          </div>
        </>
      )}
      {block.type === "slide" && videoSource(block.embed) && <VideoPlayer key={block.id+block.embed} url={block.embed} room={room} onControl={onControl} onPlaybackChange={onPlaybackChange}/>}
      {embedError&&<p role="alert" className="lh-note">{embedError}</p>}
      {block.type === "slide" && safeEmbed && !videoSource(block.embed) && (
        <>
          <iframe
            title="外部教學簡報"
            src={safeEmbed}
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allowFullScreen
          />
          <a href={block.embed} target="_blank" rel="noopener noreferrer">
            無法顯示？開新分頁
          </a>
        </>
      )}
    </div>
  );
}
function Question({ block, disabled, onSubmit, reveal=false, savedAnswer, savedAttemptId, allowRetry=false }) {
  if (block.modelVersion === 3 && [...inlineTypes,'label','hotspot','draw'].includes(block.type)) return <ParityQuestion block={block} disabled={disabled} onSubmit={onSubmit} savedAnswer={savedAnswer} savedAttemptId={savedAttemptId} allowRetry={allowRetry}/>;
  return <LegacyQuestion block={block} disabled={disabled} onSubmit={onSubmit} reveal={reveal} savedAnswer={savedAnswer} savedAttemptId={savedAttemptId} allowRetry={allowRetry}/>;
}
function LegacyQuestion({ block, disabled, onSubmit, reveal, savedAnswer, savedAttemptId, allowRetry }) {
  const [answer, setAnswer] = useState(
    block.type === "order"
      ? block.items.map((_, i) => i).reverse()
      : ["drag", "label", "category"].includes(block.type)
        ? block.items.map(() => null)
        : ['choice','multiselect'].includes(block.type)
          ? []
          : block.type === "draw"
            ? []
            : "",
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const attempt = useRef(crypto.randomUUID());
  useEffect(()=>{
    if(savedAnswer===undefined)return;
    if(block.type==='order'){
      const used=new Set();setAnswer(savedAnswer.map(v=>{const i=block.items.findIndex((s,k)=>s===v&&!used.has(k));used.add(i);return i;}).filter(i=>i>=0));
    }else setAnswer(savedAnswer);
    setSent(!allowRetry);
    if (allowRetry) attempt.current=crypto.randomUUID();
  },[savedAttemptId,allowRetry]);
  const lock = disabled || sending || sent;
  const mapValue = (i, v) =>
    setAnswer((a) => a.map((x, k) => (k === i ? v : x)));
  const move = (i, d) =>
    setAnswer((a) => {
      const b = [...a];
      [b[i], b[i + d]] = [b[i + d], b[i]];
      return b;
    });
  async function submit() {
    setSending(true);
    setError("");
    try {
      const next = await onSubmit(
        block.type === "order" ? answer.map((i) => block.items[i]) : answer,
        attempt.current,
      );
      const retry = requiresMastery(block) && next?.feedback?.outcome !== 'full';
      setSent(!retry);
      if (retry) attempt.current=crypto.randomUUID();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="lh-answer" data-question-type={block.type}>
      <div className="lh-answer-heading"><strong>{TYPES[block.type]}</strong><span>{sent ? '✓ 已送出' : '完成作答後，請按提交'}</span></div>
      {block.type==='multiselect'&&<p aria-live="polite">請選出 {block.requiredSelections??block.answer?.length} 個答案；已選 {answer.length} 個。選對加分、選錯扣分，最低零分。</p>}
      {['choice','multiselect'].includes(block.type) && (
        <div className="lh-options">
          {block.options.map((option, i) => (
            <button
              disabled={lock || (block.type==='multiselect'&&!answer.includes(i)&&answer.length>=(block.requiredSelections??block.answer?.length))}
              key={i}
              data-annotation-anchor={`option-${i}`}
              className={reveal&&block.answer?.includes(i)?'lh-correct-option':''}
              aria-pressed={answer.includes(i)}
              onClick={() =>
                setAnswer((a) =>
                  block.multiple
                    ? a.includes(i)
                      ? a.filter((x) => x !== i)
                      : [...a, i]
                    : [i],
                )
              }
            >
              {String.fromCharCode(65 + i)}. {option}
              {reveal&&block.answer?.includes(i)&&<strong className="lh-correct-label">✓ 正確答案</strong>}
              {answer.includes(i)&&<small className="lh-selected-label">已選</small>}
            </button>
          ))}
        </div>
      )}
      {["blank", "open", "cloud"].includes(block.type) && (
        <textarea
          disabled={lock}
          aria-label="你的答案"
          placeholder="在這裡輸入答案"
          maxLength={block.type === 'blank' ? 2000 : undefined}
          value={answer}
          onChange={(e) => setAnswer(block.type === 'blank' ? e.target.value : Array.from(e.target.value).slice(0,block.type === 'open'?200:100).join(''))}
        />
      )}
      {['open','cloud'].includes(block.type) && <small aria-live="polite">{textLength(answer)} / {block.type === 'open' ? 200 : 100} 字元</small>}
      {block.type === "dropdown" && (
        <select
          aria-label="選擇答案"
          disabled={lock}
          value={answer}
          onChange={(e) => setAnswer(Number(e.target.value))}
        >
          <option value="" disabled>
            請選擇…
          </option>
          {block.options.map((o, i) => (
            <option key={i} value={i}>
              {o}
            </option>
          ))}
        </select>
      )}
      {block.type === "order" && (
        <HorizontalOrder items={block.items} answer={answer} setAnswer={setAnswer} disabled={lock}/>
      )}
      {["drag", "label", "category"].includes(block.type) && (
        <>
          <p>拖曳項目至目標，也可使用下拉選單作答。</p>
          <div className="lh-options">
            {(block.type === "category"
              ? block.groups
              : block.zones.map((_, i) => `位置 ${i + 1}`)
            ).map((g, k) => (
              <div
                className="lh-target"
                key={k}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (lock) return;
                  const i = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(i) && i >= 0 && i < block.items.length)
                    mapValue(i, k);
                }}
              >
                {g}
                <p>
                  {block.items.filter((_, i) => answer[i] === k).join(" · ")}
                </p>
              </div>
            ))}
          </div>
          {block.items.map((item, i) => (
            <label
              className="lh-row"
              key={i}
              draggable={!lock}
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", String(i))
              }
            >
              {item}
              <select
                disabled={lock}
                aria-label={`${item} 的目標`}
                value={answer[i] ?? ""}
                onChange={(e) => mapValue(i, Number(e.target.value))}
              >
                <option value="" disabled>
                  請選擇
                </option>
                {(block.type === "category"
                  ? block.groups
                  : block.zones.map((_, i) => `位置 ${i + 1}`)
                ).map((g, k) => (
                  <option key={k} value={k}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </>
      )}
      {block.type === "hotspot" && (
        <div
          className="lh-hotspot"
          role="group"
          aria-label="點選圖片中的答案"
          onClick={(e) => {
            if (lock) return;
            const r = e.currentTarget.getBoundingClientRect();
            setAnswer({
              x: (e.clientX - r.left) / r.width,
              y: (e.clientY - r.top) / r.height,
            });
          }}
        >
          {block.media[0] ? (
            <Media asset={block.media[0]} />
          ) : (
            <p>點選答案所在位置</p>
          )}
          {answer?.x !== undefined && (
            <span
              style={{ left: `${answer.x * 100}%`, top: `${answer.y * 100}%` }}
            >
              ●
            </span>
          )}
        </div>
      )}
      {block.type === "draw" && (
        <Ink value={answer} onChange={setAnswer} disabled={lock} />
      )}
      {block.type === "audio" && (
        <p className="lh-note">
          目標句：{block.text}
          <br />
          錄音評分正在整合；此本機版本尚不能送出 AI 評分。
        </p>
      )}
      {block.type !== "audio" && (
        <button className="lh-primary" disabled={lock || (block.type==='multiselect'&&!answer.length)} onClick={submit}>
          {sent ? "已提交，等待老師" : sending ? "提交中…" : "提交答案"}
        </button>
      )}
      {error && (
        <p role="alert" className="lh-error">
          {error}（相同答案可直接重送）
        </p>
      )}
    </section>
  );
}
function Editor({ deck, onChange }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const [index, setIndex] = useState(0);
  const [type, setType] = useState("slide");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const undo = useRef([]),
    redo = useRef([]);
  const block = deck.blocks[Math.min(index, deck.blocks.length - 1)];
  function update(next) {
    undo.current.push(copy(deck));
    undo.current = undo.current.slice(-40);
    redo.current = [];
    onChange(next);
  }
  function patch(values) {
    update({
      ...deck,
      blocks: deck.blocks.map((b) =>
        b.id === block.id ? { ...b, ...values } : b,
      ),
    });
  }
  function addAsset(asset) {
    const target = block.id;
    let recorded = false;
    onChange((current) => { if (!recorded) { undo.current.push(copy(current)); undo.current = undo.current.slice(-40); redo.current = []; recorded = true; } return ({
      ...current,
      blocks: current.blocks.map((b) =>
        b.id === target ? { ...b, media: b.media.some(a => a.id === asset.id) ? b.media : [...b.media, asset], ...(b.questionCanvas ? { questionCanvas: { ...b.questionCanvas, elements: [...b.questionCanvas.elements, mediaElement(asset, crypto.randomUUID(), b.questionCanvas.elements.length)] } } : {}), ...(b.type==='slide'&&asset.kind==='video'&&!b.syncVideoId&&!videoSource(b.embed)?{syncVideoId:asset.id}:{}) } : b,
      ),
    }); });
  }
  function history(direction) {
    const from = direction === "undo" ? undo : redo,
      to = direction === "undo" ? redo : undo;
    if (!from.current.length) return;
    to.current.push(copy(deck));
    const next = from.current.pop();
    onChange(next);
    const retained = next.blocks.findIndex(b => b.id === block.id);
    setIndex(retained >= 0 ? retained : Math.min(index, next.blocks.length - 1));
  }
  function shift(d) {
    const blocks = [...deck.blocks];
    const to = index + d;
    if (to < 0 || to >= blocks.length) return;
    [blocks[index], blocks[to]] = [blocks[to], blocks[index]];
    update({ ...deck, blocks });
    setIndex(to);
  }
  const lines = (value) => value.split("\n");
  return (
    <div className="lh-editor" data-question-type={block.type}>
      <aside className="lh-pages">
        <div className="lh-row">
          <select
            aria-label="新增題型"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const next = ['audio','vowel'].includes(type) ? newBlock(type) : parityBlock(newBlock(type));
              update({ ...deck, blocks: [...deck.blocks, next] });
              setIndex(deck.blocks.length);
            }}
          >
            ＋
          </button>
        </div>
        {deck.blocks.map((b, i) => (
          <button
            key={b.id}
            className={i === index ? "active" : ""}
            onClick={() => {
              setIndex(i);
              setPreview(false);
            }}
          >
            <small>
              {i + 1} · {TYPES[b.type]}
              {b.hidden ? "（隱藏）" : ""}
            </small>
            <strong>{b.title}</strong>
          </button>
        ))}
      </aside>
      <main>
        <CourseName value={deck.title} onSave={title=>update({...deck,title})}/>
        <div className="lh-row">
          {block.type !== 'slide' && <><button onClick={() => history("undo")}>復原</button>
          <button onClick={() => history("redo")}>重做</button></>}
          <button onClick={() => setPreview(!preview)}>
            {preview ? "回編輯" : "學生預覽"}
          </button>
        </div>
        {preview && error && <p role="status">{error}</p>}
        {preview ? (
          <div className={["slide","vowel"].includes(block.type) ? "" : "lh-question-layout"}>
            {(block.type !== "vowel" || block.questionCanvas) && <BlockContent block={block} />}
            {block.type !== "slide" && (
              block.type === "vowel" ? (
                <VowelQuestion key={block.id} block={block} preview />
              ) : (
                <Question
                  key={block.id}
                  block={block.modelVersion===3 ? publicParity(block) : block}
                  onSubmit={async (answer) => {
                    const {grade,validateDeck}=await import('./domain.mjs');
                    validateDeck({...deck,blocks:[block]});
                    if(block.type==='open'&&(!String(answer).trim()||textLength(answer)>200))throw new Error('請輸入 1–200 字元。');
                    const result=grade(block,answer);
                    setError(`預覽評分：${result.status} · ${result.score??'待評'} / ${result.max}`);
                  }}
                  disabled={false}
                />
              )
            )}
          </div>
        ) : (
          <>
            <div className="lh-row">
              <button onClick={() => shift(-1)}>↑</button>
              {block.modelVersion!==3 && !['audio','vowel'].includes(block.type) && <button onClick={()=>{const converted=convertBlock(block,crypto.randomUUID());converted.hidden=true;update({...deck,blocks:[...deck.blocks,converted]});setIndex(deck.blocks.length);setError('新版副本已建立並暫時隱藏；原題保留。請完成轉換報告後再顯示。');}}>建立新版副本（保留原題）</button>}
              <button onClick={() => shift(1)}>↓</button>
              <button
                onClick={() => {
                  update({
                    ...deck,
                    blocks: [
                      ...deck.blocks,
                      { ...copy(block), id: crypto.randomUUID() },
                    ],
                  });
                  setIndex(deck.blocks.length);
                }}
              >
                複製
              </button>
              <button onClick={() => patch({ hidden: !block.hidden })}>
                {block.hidden ? "顯示" : "隱藏"}
              </button>
              <button
                disabled={deck.blocks.length === 1}
                onClick={() => {
                  update({
                    ...deck,
                    blocks: deck.blocks.filter((b) => b.id !== block.id),
                  });
                  setIndex(Math.max(0, index - 1));
                }}
              >
                刪除這頁
              </button>
            </div>
            {block.type === 'slide' ? <SlideEditor key={block.id} block={block} onPatch={patch} types={TYPES}
              onUndo={() => history('undo')} onRedo={() => history('redo')} canUndo={undo.current.length > 0} canRedo={redo.current.length > 0}
              onTheme={(theme, all) => update({ ...deck, blocks: deck.blocks.map(b => all || b.id === block.id ? applyTheme(b, theme) : b) })}
              onRestore={() => patch({ ...restoreOriginal({ ...block, slideCanvas: canvasFor(block) }), slideCanvas: undefined, syncVideoId: canvasFor(block).original?.syncVideoId })}
              onAddAsset={asset => {
                const target = block.id;
                let recorded = false;
                onChange(current => { if (!recorded) { undo.current.push(copy(current)); undo.current = undo.current.slice(-40); redo.current = []; recorded = true; } return ({ ...current, blocks: current.blocks.map(b => {
                  if (b.id !== target) return b;
                  const c = canvasFor(b), existing = (b.media || []).some(a => a.id === asset.id);
                  return { ...b, media: existing ? b.media : [...b.media, asset], slideCanvas: { ...c, elements: [...c.elements, mediaElement(asset, crypto.randomUUID(), c.elements.length)] }, ...(asset.kind === 'video' && !b.syncVideoId && !videoSource(b.embed) ? { syncVideoId: asset.id } : {}) };
                }) }); });
              }}
              onConvert={kind => {
                const base = ['audio', 'vowel'].includes(kind) ? newBlock(kind) : parityBlock(newBlock(kind));
                const converted = slideToQuestion(block, base);
                update({ ...deck, blocks: [...deck.blocks, converted] }); setIndex(deck.blocks.length);
                setError('題目副本已建立並隱藏。請設定題幹、選項與正解，確認後再顯示。');
              }} /> : <section className={`lh-form ${block.type === "slide" ? "lh-slide-form" : "lh-question-form"}`}>
              <div className="lh-form-intro">
                <span>{block.type === "slide" ? "教材投影片" : `互動題目 · ${TYPES[block.type]}`}</span>
                <h2>{block.type === "slide" ? "投影片內容" : TYPES[block.type]}</h2>
                <p>{block.type === "slide" ? "編排教材與公開簡報連結。" : "用標題作為學生看到的題目，再設定素材與答案。"}</p>
              </div>
              <div className="lh-studio-layout"><div className="lh-studio-canvas">
              {block.conversionSourceId && <div className="lh-note"><p>教材已帶入學生題幹，原投影片保留。請完成本題內容、選項與正解。</p><label><input type="checkbox" checked={!block.conversionPending} onChange={e => patch({ conversionPending: !e.target.checked })} />我已確認題幹、選項與正解</label><BlockContent block={block} /><details><summary>編輯帶入的教材</summary><SlideEditor key={block.id} asStem block={block} onPatch={patch} onAddAsset={addAsset} onTheme={theme => patch({ questionCanvas: { ...block.questionCanvas, theme } })} onUndo={() => history('undo')} onRedo={() => history('redo')} canUndo={undo.current.length > 0} canRedo={redo.current.length > 0} /></details></div>}
              <label className="lh-field-card lh-field-title">
                標題
                <input
                  value={block.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
              {(block.type === "slide" || block.type === "audio") && (
                <label className="lh-field-card">
                  {block.type === "audio" ? "目標朗讀句" : "教材內容"}
                  <textarea
                    value={block.text}
                    onChange={(e) => patch({ text: e.target.value })}
                  />
                </label>
              )}
              {block.type !== "vowel" && !block.questionCanvas && <details className="lh-appearance"><summary>文字樣式與進階配置</summary>
              {block.type !== "vowel" && <div className="lh-row lh-setting-row">
                <label>
                  字型
                  <select
                    value={block.font}
                    onChange={(e) => patch({ font: e.target.value })}
                  >
                    <option value="comic">Comic Relief</option>
                    <option value="kai">楷體（裝置可用字型）</option>
                  </select>
                </label>
                <label>
                  字級
                  <input
                    type="number"
                    min="16"
                    max="80"
                    value={block.fontSize}
                    onChange={(e) =>
                      patch({ fontSize: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  文字色
                  <input
                    type="color"
                    value={block.color}
                    onChange={(e) => patch({ color: e.target.value })}
                  />
                </label>
                <label>
                  版型
                  <select
                    value={block.layout}
                    onChange={(e) => patch({ layout: e.target.value })}
                  >
                    <option value="split">圖文雙欄</option>
                    <option value="full">全寬</option>
                    <option value="free">進階自由配置</option>
                  </select>
                </label>
              </div>}
              {block.type !== "vowel" && <AdvancedEditor block={block} onChange={patch} />}
              </details>}
              {block.type !== "vowel" && <ImageSearch onAdd={addAsset} halfSize={block.type !== "slide"} />}
              {block.type === "vowel" && (
                <>
                <h3 className="lh-form-section-title">三字三圖設定</h3>
                <VowelEditor
                  block={block}
                  onPatch={patch}
                  onChange={onChange}
                  onStatus={setUploadStatus}
                  onError={setError}
                />
                </>
              )}
              {block.type !== "vowel" && <div className="lh-media-tools" aria-label="加入題目素材">{[
                ['▧ 加入圖片', 'image/png,image/jpeg,image/webp'],
                ['♫ 加入音檔', 'audio/mpeg,audio/wav'],
                ['▶ 加入影片', 'video/mp4,video/webm'],
              ].map(([label, accept]) => <label className="lh-media-tool" key={label}>
                <strong>{label}</strong>
                <input
                  type="file"
                  aria-label={label.slice(2)}
                  accept={accept}
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    try {
                      setError("");
                      setUploadStatus("處理素材…");
                      const a = await saveAsset(f, {
                        onProgress: setUploadStatus,
                        halfSize: block.type !== "slide",
                      });
                      addAsset(a);
                      setUploadStatus(
                        a.status === "queued"
                          ? "影片已排入轉檔。"
                          : "素材已加入。",
                      );
                    } catch (err) {
                      setError(err.message);
                      setUploadStatus("");
                    }
                  }}
                />
              </label>)}</div>}
              {block.type !== "vowel" && uploadStatus && <p role="status">{uploadStatus}</p>}
              {block.type !== "vowel" && <p className="lh-note">
                圖片保留原檔並壓縮成 WebP；影片試行上限 5 分鐘／100 MB，轉為 H.264/AAC、最高 720p 並產生封面。
                {cloudMode ? "雲端素材儲存在教師私有空間。" : "素材保存在本機研發服務。"}
              </p>}
              {block.type !== "vowel" && block.media.map((a) => (
                <div key={a.id} className="lh-row lh-media-preview">
                  <Media asset={a} />
                  <span>{a.name}</span>
                  {block.layout === "free" && !block.questionCanvas && (
                    <>
                      <label>
                        水平位移
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={a.x || 0}
                          onChange={(e) =>
                            patch({
                              media: block.media.map((m) =>
                                m.id === a.id
                                  ? { ...m, x: Number(e.target.value) }
                                  : m,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        寬度
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={a.width || 80}
                          onChange={(e) =>
                            patch({
                              media: block.media.map((m) =>
                                m.id === a.id
                                  ? { ...m, width: Number(e.target.value) }
                                  : m,
                              ),
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  <button
                    onClick={() =>
                      patch({ media: block.media.filter((m) => m.id !== a.id), ...(block.questionCanvas ? { questionCanvas: { ...block.questionCanvas, elements: block.questionCanvas.elements.filter(e => e.assetId !== a.id) } } : {}), ...(block.syncVideoId===a.id?{syncVideoId:''}:{}) })
                    }
                  >
                    移除此頁引用
                  </button>
                </div>
              ))}
              {block.type==='slide'&&<label className="lh-field-card">本站同步影片（每頁一支）
                <select aria-label="本站同步影片" value={block.syncVideoId||''} onChange={e=>patch({syncVideoId:e.target.value,...(e.target.value&&videoSource(block.embed)?{embed:''}:{})})}>
                  <option value="">未選擇；請先用「加入影片」上傳</option>
                  {block.media.filter(m=>m.kind==='video').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <small>選取後由教師全班控制。切換至上傳影片會清除外部影片連結；不刪除原始素材。舊影片不自動轉換。</small>
              </label>}
              {block.type === "slide" && <label className="lh-field-card">
                教材連結：YouTube／Google Drive 影片／Google Slides／Canva
                <input
                  value={block.embed}
                  onChange={(e) => patch({ embed: e.target.value, ...(videoSource(e.target.value)?{syncVideoId:''}:{}) })}
                  placeholder="貼上完整影片或簡報 HTTPS 連結"
                />
              </label>}
              {block.type !== "slide" && <h3 className="lh-form-section-title">答案與評量</h3>}
              {block.modelVersion===3 && <ParityEditor block={block} patch={patch}/>}
              {!(block.modelVersion===3 && inlineTypes.includes(block.type)) && <AnswerEditor block={block} patch={patch} />}
              {["drag", "label", "category"].includes(block.type) && !(block.modelVersion===3 && ['drag','label'].includes(block.type)) && (
                <label>
                  項目（排序題請按正確順序，每行一個）
                  <textarea
                    value={block.items.join("\n")}
                    onChange={(e) => {
                      const items = lines(e.target.value);
                      patch({
                        items,
                        mapping: items.map((_, i) => block.mapping[i] ?? 0),
                      });
                    }}
                  />
                </label>
              )}
              {block.type === "category" && (
                <label>
                  分類（每行一組）
                  <textarea
                    value={block.groups.join("\n")}
                    onChange={(e) => patch({ groups: lines(e.target.value) })}
                  />
                </label>
              )}
              {block.modelVersion!==3 && ["drag", "label", "hotspot"].includes(block.type) && <ZoneEditor block={block} patch={patch} />}
              {["drag", "label", "category"].includes(block.type) && !(block.modelVersion===3 && ['drag','label'].includes(block.type)) &&
                block.items.map((item, i) => (
                  <label key={i}>
                    {item} → 正確位置
                    <select
                      value={block.mapping[i]}
                      onChange={(e) =>
                        patch({
                          mapping: block.mapping.map((m, k) =>
                            k === i ? Number(e.target.value) : m,
                          ),
                        })
                      }
                    >
                      {(block.type === "category"
                        ? block.groups
                        : block.zones.map((_, i) => `位置 ${i + 1}`)
                      ).map((v, k) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              {block.type === "audio" && (
                <label>
                  發音評分重點
                  <textarea
                    value={block.focusRule}
                    onChange={(e) => patch({ focusRule: e.target.value })}
                  />
                  <small>80 分過關，每天最多 3 次；最高分與教師放行。</small>
                </label>
              )}
              </div><aside className="lh-question-settings" aria-label="題目設定">
              <h3>⚙ {block.type === "slide" ? "教材設定" : "評量設定"}</h3>
              <p className="lh-note">{TYPES[block.type]} · 第 {index + 1} 頁</p>
              <button className="lh-primary" onClick={() => setPreview(true)}>▷ 學生預覽</button>
              {block.type !== "slide" && (
                <div className="lh-row">
                  <label>
                    分數
                    <select
                      value={block.points}
                      disabled={block.type==='cloud'}
                      onChange={(e) =>
                        patch({ points: Number(e.target.value) })
                      }
                    >
                      {(block.points < 1 || block.points > 10) && (
                        <option value={block.points}>原設定：{block.points} 分</option>
                      )}
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((points) => (
                        <option key={points} value={points}>{points} 分</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    作答時間
                    <select
                      value={block.seconds}
                      onChange={(e) =>
                        patch({ seconds: Number(e.target.value) })
                      }
                    >
                      {!questionMinutes.some((minutes) => minutes * 60 === block.seconds) && (
                        <option value={block.seconds}>
                          原設定：{block.seconds === 0 ? "不限時" : `${block.seconds} 秒`}
                        </option>
                      )}
                      {questionMinutes.map((minutes) => (
                        <option key={minutes} value={minutes * 60}>{minutes} 分鐘</option>
                      ))}
                    </select>
                  </label>
                  {block.type !== "vowel" && (
                    <>
                      <label>
                        <input
                          type="checkbox"
                          checked={block.partial}
                          disabled={['cloud','open','draw','multiselect'].includes(block.type)}
                          onChange={(e) => patch({ partial: e.target.checked })}
                        />
                        部分給分
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={block.ungraded}
                          disabled={['cloud','multiselect'].includes(block.type)}
                          onChange={(e) => patch({ ungraded: e.target.checked })}
                        />
                        不計分
                      </label>
                    </>
                  )}
                </div>
              )}
              {block.type === "slide" && <label className="lh-field-card">
                教師私有備註
                <textarea
                  value={block.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              </label>}
              </aside></div>
            </section>}
            {error && <p className="lh-error">{error}</p>}
          </>
        )}
      </main>
    </div>
  );
}
function Classroom({ initial, onExit }) {
  const [room, setRoom] = useState(initial),
    [error, setError] = useState(""),
    [annotationDirty, setAnnotationDirty] = useState(false),
    [whiteboard, setWhiteboard] = useState(false),
    [rows, setRows] = useState(null),
    [reportInfo,setReportInfo] = useState(null),
    [controlBusy, setControlBusy] = useState(false),
    [localVideoPlaying, setLocalVideoPlaying] = useState(false),
    [embeddedVideoPlaying, setEmbeddedVideoPlaying] = useState(false);
  const feedbackAudio = useStudentFeedbackAudio();
  const current = useRef(initial);
  const busy = useRef(false);
  useEffect(() => {
    if (student) window.scrollTo({top:0,behavior:"instant"});
    feedbackAudio.clearFeedback();
    setLocalVideoPlaying(false);
    setEmbeddedVideoPlaying(false);
  }, [room.block.id, room.openedAt]);
  useEffect(() => {
    if (!room.teacher) return;
    const focusOnPlay = event => { if (event.target.tagName === 'VIDEO' && event.target.closest('.lh-live-grid') && !current.current.focus && !current.current.block.syncVideoId) void control('focus', { enabled:true, blockId:current.current.block.id }); };
    document.addEventListener('play', focusOnPlay, true);
    const update = () => setLocalVideoPlaying([...document.querySelectorAll('.lh-live-grid video, .lh-live-grid audio')].some(media => !media.paused && !media.ended));
    for (const event of ['play', 'pause', 'ended', 'emptied']) document.addEventListener(event, update, true);
    return () => { document.removeEventListener('play', focusOnPlay, true); for (const event of ['play', 'pause', 'ended', 'emptied']) document.removeEventListener(event, update, true); };
  }, [room.teacher]);
  function acceptRoom(next) {
    const prior = current.current;
    if (next.revision < prior.revision) return;
    if (
      next.revision === prior.revision &&
      (next.reward?.version || 0) < (prior.reward?.version || 0)
    )
      return;
    if (
      next.revision === prior.revision &&
      next.openedAt === prior.openedAt &&
      (next.vowelProgress?.version || 0) <
        (prior.vowelProgress?.version || 0)
    )
      return;
    current.current = next;
    setRoom(next);
  }
  const code = initial.code;
  useEffect(() => {
    if (!student || room.reward?.game !== 'basketball' || navigator.connection?.saveData) return;
    // Prefetch this class's game, without delaying the question or grading.
    const timer = setTimeout(() => {
      for (const file of ['court', 'cat-dog', 'rabbit-panda', 'fox-penguin']) {
        const image = new Image();
        image.fetchPriority = 'low';
        image.src = `/live-games/basketball/${file}.webp`;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [room.reward?.game]);
  useEffect(() => {
    let stop = false;
    let timer;
    async function poll() {
      try {
        const next = await api("snapshot", code);
        if (!stop && next.revision >= current.current.revision) {
          acceptRoom(next);
          setError("");
        }
      } catch (e) {
        if (!stop) setError(`連線中斷，正在重連：${e.message}`);
      }
      if (!stop && current.current.phase!=='complete') timer = setTimeout(poll, 1200);
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [code]);
  async function control(action, extra = {}) {
    if (busy.current) return;
    busy.current = true;
    setControlBusy(true);
    try {
      const next = await api("control", code, {
        action,
        revision: current.current.revision,
        ...extra,
      });
      current.current = next;
      setRoom(next);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      busy.current = false;
      setControlBusy(false);
    }
  }
  async function saveAnnotations(lines) {
    if(busy.current)throw new Error('另一項操作同步中，請重試。');
    busy.current=true;setControlBusy(true);
    const blockId=room.block.id;
    try{
      const fresh=await api('snapshot',code);acceptRoom(fresh);
      if(fresh.block.id!==blockId)throw new Error('題目已切換，未覆蓋新題標註。');
      const next=await api('control',code,{action:'annotate',revision:fresh.revision,blockId,lines});acceptRoom(next);
    }finally{busy.current=false;setControlBusy(false);}
  }
  async function submitAnswer(answer,attemptId) {
    feedbackAudio.arm();
    const original=current.current;
    const input={answer,attemptId,blockId:original.block.id,revision:original.revision};
    const completed = next => { acceptRoom(next); if(current.current.block.id===original.block.id && current.current.openedAt===original.openedAt) feedbackAudio.announce(next.feedback); return next; };
    try{return completed(await api('submit',code,input));}catch(e){
      if(!/已關閉或切換|課堂已更新/.test(e.message))throw e;
      const fresh=await api('snapshot',code);acceptRoom(fresh);
      if(fresh.phase!=='question'||fresh.block.id!==original.block.id||fresh.openedAt!==original.openedAt)throw e;
      // One idempotent retry for non-question state updates, such as teacher ink.
      return completed(await api('submit',code,{...input,revision:fresh.revision}));
    }
  }
  const active = room.responses.filter((r) => r.blockId === room.block.id && r.openedAt===room.openedAt);
  const myResponse=active.at(-1);
  const showReward=room.reward?.eligible && !error && !feedbackAudio.celebrating;
  const submitted = new Set(active.map((r) => r.uid)).size;
  return (
    <>
      <div className="lh-row lh-classbar" data-phase={room.phase}>
        <strong>{room.title}</strong>
        <span>課間遊戲：{REWARD_GAMES[room.rewardGame]}</span>
        <span>
          第 {room.index + 1} / {room.count} 頁 · {room.phase}
        </span>
        <button onClick={onExit} disabled={annotationDirty||controlBusy}>回備課</button>
      </div>
      {error && (
        <p role="alert" className="lh-error">
          {error}
        </p>
      )}
      {room.wordCloud && <section className="lh-word-cloud" aria-label="文字雲彙整">{room.wordCloud.map(w=><span key={w.text} style={{fontSize:`${20+Math.min(w.count,8)*6}px`}}>{w.text}<small> ×{w.count}</small></span>)}</section>}
      {room.teacher ? (
        <>
          <div className="lh-control">
            <JoinPanel code={code} cloudMode={cloudMode} />
            <fieldset className="lh-row lh-control-actions" disabled={controlBusy||annotationDirty}>
              <button className="lh-action-start"
                onClick={() => control("start")}
                disabled={room.phase !== "lobby"}
              >
                開始上課
              </button>
              <button className="lh-action-previous"
                onClick={() => control("move", { index: room.index - 1 })}
                disabled={room.index === 0 || room.phase === "complete"}
              >
                上一頁
              </button>
              <button className="lh-action-next"
                onClick={() => control("move", { index: room.index + 1 })}
                disabled={
                  room.index === room.count - 1 || room.phase === "complete"
                }
              >
                下一頁
              </button>
              <button
                className="lh-primary lh-action-open"
                onClick={() => control("open")}
                disabled={
                  room.block.type === "slide" || room.phase === "complete"
                }
              >
                開放作答
              </button>
              <button className="lh-action-lock"
                onClick={() => control("lock")}
                disabled={room.phase !== "question"}
              >
                鎖題
              </button>
              <button className="lh-action-focus"
                onClick={() =>
                  control(room.phase === "paused" && !room.focus ? "resume" : "focus", { enabled: !(room.focus || room.phase === "paused") })
                }
                disabled={room.phase === "complete"}
              >
                {room.focus || room.phase === "paused" ? "回到活動" : "Eyes Up Front"}
              </button>
              <button className="lh-action-discussion"
                onClick={() => control("pause")}
                disabled={room.phase === "complete" || room.phase === "paused"}
              >
                暫停討論
              </button>
              <button className="lh-action-reveal"
                onClick={() => control("reveal")}
                disabled={room.phase === "complete"}
              >
                公布答案
              </button>
              <button className="lh-action-ink" aria-pressed={whiteboard} onClick={() => setWhiteboard(!whiteboard)}>
                白板／標註
              </button>
              <button className="lh-action-end"
                onClick={() => {
                  if (confirm("結束後學生不能再提交，確定結束？"))
                    control("end");
                }}
                disabled={room.phase === "complete"}
              >
                結束課堂
              </button>
              {controlBusy && <span role="status">同步中…</span>}
            </fieldset>
            <TeacherMusic
              blockId={room.block.id}
              blockType={room.block.type}
              phase={room.phase}
              videoPlaying={localVideoPlaying || embeddedVideoPlaying}
            />
          </div>
          <div className="lh-live-grid">
            <main>
              <AnnotationSurface key={room.block.id} lines={room.annotations||[]} enabled={whiteboard&&room.phase!=='complete'} onSave={saveAnnotations} onDirty={setAnnotationDirty}>
              {room.block.type === "vowel" ? (
                <VowelQuestion block={room.block} preview disabled />
              ) : (
                <BlockContent block={room.block} room={room} onControl={control} onPlaybackChange={setEmbeddedVideoPlaying} />
              )}
              {!['slide','vowel','audio'].includes(room.block.type) && <div className="lh-teacher-preview"><Question key={`${room.block.id}-${room.openedAt}`} block={publicBlock(room.block,room.reveal)} reveal={room.reveal} disabled onSubmit={async()=>{}}/>{room.reveal&&!['choice','multiselect'].includes(room.block.type)&&<p className="lh-review-solution">正確答案：{correctText(room.block)}</p>}</div>}
              </AnnotationSurface>
              {room.block.type === "slide" && (
                <p className="lh-note">教師備註：{room.block.notes || "—"}</p>
              )}
            </main>
            <aside className="lh-dashboard">
              <h3>
                參與者 {room.participants.length} · 本題已答 {submitted}
              </h3>
              {room.participants.map((p) => (
                <div className={`lh-row lh-participant status-${answerStatus(room.block,active.find(r=>r.uid===p.uid))}`} key={p.uid}>
                  <strong>{p.studentId}</strong>
                  <span>{reviewLabels[answerStatus(room.block,active.find(r=>r.uid===p.uid))]}</span>
                  <small>{p.online?'在線':'暫未偵測在線'}</small>
                  <button
                    onClick={() => control("remove", { uid: p.uid })}
                    disabled={room.phase === "complete"}
                  >
                    解除
                  </button>
                </div>
              ))}
              <h3>答案彙整</h3>
              {active.map((r, i) => (
                <article key={r.attemptId}>
                  <strong className="lh-student-id">學號 {room.participants.find(p=>p.uid===r.uid)?.studentId||'已離開的參與者'}</strong>
                  <p className={`lh-result-badge status-${answerStatus(room.block,r)}`}>{reviewLabels[answerStatus(room.block,r)]}</p>
                  <p>
                    {r.grade.status === "pending"
                      ? "待教師評分"
                      : r.grade.status === "ungraded"
                        ? "不計分"
                        : `${r.grade.score} / ${r.grade.max}`}
                  </p>
                  {room.block.type === "draw" ? (
                    <Ink value={r.answer} disabled />
                  ) : (
                    <pre>
                      {answerText(room.block,r.answer)}
                    </pre>
                  )}
                  {r.ai && (
                    <button
                      onClick={() =>
                        control("grade", {
                          attemptId: r.attemptId,
                          score: r.grade.score,
                          pass: true,
                        })
                      }
                    >
                      教師人工放行
                    </button>
                  )}
                  {["open", "draw"].includes(room.block.type) && (
                    <div className="lh-row">
                      <button
                        onClick={() =>
                          control("grade", {
                            attemptId: r.attemptId,
                            score: r.grade.max,
                            pass: true,
                          })
                        }
                      >
                        判定通過（2 次）
                      </button>
                      <button
                        onClick={() =>
                          control("grade", {
                            attemptId: r.attemptId,
                            score: 0,
                            pass: false,
                          })
                        }
                      >
                        判定未通過（1 次）
                      </button>
                    </div>
                  )}
                  {["open", "draw"].includes(room.block.type) && (
                    <button
                      onClick={() => {
                        const v = prompt(`給分（0–${r.grade.max}）`);
                        if (v !== null)
                          control("grade", {
                            attemptId: r.attemptId,
                            score: Number(v),
                            pass: confirm(
                              "本次判定通過嗎？確定＝通過（2 次）；取消＝未通過（1 次）。",
                            ),
                          });
                      }}
                    >
                      人工評分
                    </button>
                  )}
                </article>
              ))}
            </aside>
          </div>
          {room.phase === "complete" && (
            <section>
              <button
                className="lh-primary"
                onClick={async () => {
                  try {
                    const result=await api('report',code);setRows(result.report);setReportInfo(result);
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                查看課後報告
              </button>
              {rows && (
                <>
                  <ReviewReport rows={rows} blocks={reportInfo?.reportBlocks} meta={reportInfo?.meta}/>
                  <details className="lh-report-legacy"><summary>原始總表與匯出</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>學號</th>
                        <th>交卷題數</th>
                        <th>待評</th>
                        <th>分數</th>
                        <th>遊戲分數（獨立）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.studentId}>
                          <td>{r.studentId}</td>
                          <td>{r.submitted}</td>
                          <td>{r.pending}</td>
                          <td>
                            {r.score} / {r.max}
                          </td>
                          <td>
                            {r.gameScore || 0}（{r.gameTurns || 0} 次）
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => {
                      const csv =
                        "\ufeff學號,交卷題數,待評,得分,滿分,遊戲分數,遊玩次數\n" +
                        rows
                          .map((r) =>
                            [
                              r.studentId,
                              r.submitted,
                              r.pending,
                              r.score,
                              r.max,
                              r.gameScore || 0,
                              r.gameTurns || 0,
                            ].join(","),
                          )
                          .join("\n");
                      const url = URL.createObjectURL(
                        new Blob([csv], { type: "text/csv;charset=utf-8" }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `lesson-${code}.csv`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    下載 CSV
                  </button>
                  <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`lesson-${code}-details.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>下載逐題評分明細 JSON</button>
                  <details><summary>逐題作答與評分版本</summary>{rows.map(r=><section key={r.studentId}><h4>{r.studentId}</h4>{r.details?.map(d=><div key={d.blockId}><strong>{TYPES[d.type]} · {d.scoringVersion}</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({answer:d.answer,grade:d.grade},null,2)}</pre></div>)}</section>)}</details>
                  </details>
                </>
              )}
            </section>
          )}
        </>
      ) : (
        <main className="lh-student">
          {feedbackAudio.controls}
          <AnnotationSurface key={room.block.id} lines={room.annotations||[]} readOnly>
          {room.phase === "lobby" ? (
            <div className="lh-wait">
              <h1>你已加入課堂</h1>
              <p>請等老師開始。</p>
            </div>
          ) : (room.focus || room.phase === "paused") && room.phase !== "complete" ? (
            <FocusScreen />
          ) : room.phase === "complete" ? (
            <div className="lh-wait">
              <h1>今天辛苦了！</h1>
              <p>課堂已結束，作答已保存。</p>
            </div>
          ) : (
            <>
              {showReward && (
                <RewardGames
                  key={`reward-${room.block.id}-${room.openedAt}`}
                  room={room}
                  onRoom={acceptRoom}
                />
              )}
              {room.responses.some(
                (r) =>
                  r.blockId === room.block.id &&
                  r.openedAt === room.openedAt &&
                  r.grade.status === "pending",
              ) && (
                <p role="status">等待教師／AI 評分，尚未發放本題遊戲機會。</p>
              )}
              {!showReward && <div className={["slide","vowel"].includes(room.block.type) ? "" : "lh-question-layout"}>
              {(room.block.type !== "vowel" || room.block.questionCanvas) && (
                <BlockContent block={room.block} room={room} />
              )}
              {room.responses?.some(
                (r) =>
                  r.blockId === room.block.id && r.openedAt === room.openedAt,
              ) && <p role="status">本次作答已保存，等待老師。</p>}
              {room.block.type === "audio" && (
                <AudioAnswer
                  key={`${room.block.id}-${room.openedAt}`}
                  code={code}
                  block={room.block}
                  responses={room.responses}
                  disabled={room.phase !== "question"}
                />
              )}
              {room.block.type === "vowel" && (
                <VowelQuestion
                  key={`${room.block.id}-${room.openedAt}`}
                  block={room.block}
                  progress={room.vowelProgress}
                  disabled={
                    room.phase !== "question" ||
                    room.responses?.some(
                      (r) =>
                        r.blockId === room.block.id &&
                        r.openedAt === room.openedAt,
                    )
                  }
                  onTap={async (wordIndex, letterIndex) => {
                    feedbackAudio.arm();
                    const next = await api("vowelTap", code, {
                      blockId: room.block.id,
                      revision: room.revision,
                      wordIndex,
                      letterIndex,
                    });
                    acceptRoom(next);
                    feedbackAudio.announce(next.feedback);
                    return next.tap;
                  }}
                />
              )}
              {room.block.type !== "slide" &&
                room.block.type !== "audio" &&
                room.block.type !== "vowel" &&
                (
                  <Question
                    key={`${room.block.id}-${room.openedAt}`}
                    block={room.block}
                    reveal={room.reveal}
                    savedAnswer={myResponse?.answer}
                    savedAttemptId={myResponse?.attemptId}
                    allowRetry={canRetryResponse(room.block,myResponse)}
                    disabled={room.phase !== "question"||room.reveal||(!!myResponse&&!canRetryResponse(room.block,myResponse))}
                    onSubmit={submitAnswer}
                  />
                )}
              </div>}
              <p>
                {room.phase === "content"
                  ? "等待老師開題"
                  : room.phase === "locked"
                    ? "老師已鎖題，請一起檢討"
                    : ""}
              </p>
              {room.reveal && !['choice','multiselect'].includes(room.block.type) && (
                <p className="lh-review-solution">
                  答案：
                  {room.block.modelVersion===3 ? solutionText(room.block) : room.block.type === "vowel"
                    ? room.block.vowelWords
                        .map((word) =>
                          word.targets.map((i) => word.word[i]).join(""),
                        )
                        .join(" / ")
                    : room.block.alternatives?.join(" / ") ||
                    room.block.answer
                      ?.map((i) => room.block.options[i])
                      .join(" / ") ||
                    room.block.mapping?.map((i) => i + 1).join(", ")}
                </p>
              )}
            </>
          )}
          </AnnotationSurface>
        </main>
      )}
    </>
  );
}
export default function LiveApp() {
  const [deck, setDeck] = useState(null),
    [decks, setDecks] = useState([]),
    [room, setRoom] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [sid, setSid] = useState(""),
    [code, setCode] = useState(params.get("join") || ""),
    [lessonId, setLessonId] = useState(""),
    [naming, setNaming] = useState(false);
  const lessons = useRef(createSeedLessons());
  const version = useRef(new Map());
  const loaded = useRef(false);
  const history = useRef([]);
  const saveQueue = useRef(Promise.resolve());
  const failedSave = useRef(false);
  const latest = useRef(deck);
  latest.current = deck;
  useEffect(() => {
    const active = student
      ? params.get("join") || sessionStorage.getItem("hub-lab-student-room")
      : sessionStorage.getItem("hub-lab-active-room");
    if (active)
      api("snapshot", active)
        .then(setRoom)
        .catch(() => {
          if (student || !cloudMode)
            sessionStorage.removeItem(
              student ? "hub-lab-student-room" : "hub-lab-active-room",
            );
        });
  }, []);
  useEffect(() => {
    if (student) return;
    api("decks")
      .then((r) => {
        setDecks(r.decks);
        loaded.current = true;
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!deck || !loaded.current) return;
    setMessage("尚未儲存…");
    const value = copy(deck);
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const result = await api("saveDeck", null, {
          deck: value,
          expectedVersion: version.current.get(value.id) || 0,
        });
        version.current.set(value.id, result.deck.version);
        failedSave.current=false;
        history.current.push(copy(result.deck));
        history.current = history.current.slice(-20);
        setDecks((d) => [
          ...d.filter((x) => x.id !== result.deck.id),
          result.deck,
        ]);
        if (latest.current === deck)
          setMessage(`草稿已儲存 · 版本 ${result.deck.version}`);
        setError("");
      } catch (e) {
        failedSave.current=true;
        setError(e.message);
        setMessage("儲存未完成");
      }
    });
  }, [deck]);
  function select(d) {
    version.current.set(d.id, d.version || 0);
    history.current = [];
    setDeck(copy(d));
  }
  function create(name) {
    const title=courseName(name);
    setNaming(false);
    select({
      schemaVersion: 2,
      id: crypto.randomUUID(),
      title,
      blocks: [parityBlock(newBlock())],
      version: 0,
    });
  }
  function adapt() {
    const lesson = lessons.current.find((l) => l.id === lessonId);
    if (!lesson) return;
    select({
      id: crypto.randomUUID(),
      schemaVersion: 2,
      title: lesson.title,
      legacyLessonId: lesson.id,
      version: 0,
      blocks: lesson.steps
        .filter((s) => s.enabled)
        .map((s) => ({
          ...newBlock("slide"),
          title: s.title,
          text: `原課程步驟：${s.type}\n請從原 Lesson Flow 使用既有教材；此頁可加入新的內容與互動題。`,
          legacy: {
            lessonId: lesson.id,
            stepId: s.id,
            content: copy(s.content),
          },
        })),
    });
  }
  return (
    <div className="lh-lab lh-space" data-live-student={student && !!room}>
      <header>
        <a href="/">English Lesson Hub</a>
        <span>
          LIVE STUDIO · {cloudMode ? "雲端 v2 測試版" : "本機研發預覽"}
        </span>
        <a href="/lab?join=">學生入口</a>
      </header>
      <SpaceTheme student={student || params.has('join')} live={!!room} />
      {cloudMode && !student && (
        <form
          className="lh-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const field = e.currentTarget.elements.passcode;
            const value = field.value;
            field.value = "";
            try {
              await loginTeacher(value);
              const result = await api("decks");
              setDecks(result.decks);
              loaded.current = true;
              setError("");
              const active = sessionStorage.getItem("hub-lab-active-room");
              if (active) setRoom(await api("snapshot", active));
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <label>
            教師驗證{" "}
            <input
              name="passcode"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
            />
          </label>
          <button>解鎖雲端備課</button>
        </form>
      )}
      {!cloudMode && !import.meta.env.DEV && (
        <p className="lh-error">此新版目前僅供本機驗收，雲端服務尚未啟用。</p>
      )}
      {!student&&!room&&<ReportHistory/>}
      {room ? (
        <Classroom
          initial={room}
          onExit={() => {
            sessionStorage.removeItem(
              student ? "hub-lab-student-room" : "hub-lab-active-room",
            );
            setRoom(null);
          }}
        />
      ) : student || params.has("join") ? (
        <form
          className="lh-join"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setRoom(await api("join", code, { studentId: sid }));
              sessionStorage.setItem("hub-lab-student-room", code);
              setError("");
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <p className="lh-eyebrow">READY TO LEARN?</p>
          <h1>加入今天的課堂</h1>
          <label>
            六位數加入碼
            <input
              inputMode="numeric"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label>
            五位數學號
            <input
              inputMode="numeric"
              maxLength="5"
              value={sid}
              onChange={(e) => setSid(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="lh-primary">加入課堂</button>
          {error && (
            <p role="alert" className="lh-error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <>
          {!deck && <div className="lh-title">
            <div>
              <p className="lh-eyebrow">TEACH · ASK · DISCUSS</p>
              <h1>讓每一頁，都有回應。</h1>
              <p>先準備教材，再帶著全班一起學習。</p>
            </div>
            <button className="lh-primary" disabled={cloudMode&&!loaded.current} onClick={()=>setNaming(true)}>
              ＋ 建立互動課程
            </button>
          </div>}
          {!deck&&naming&&<CourseName create onSave={create} onCancel={()=>setNaming(false)}/>}
          {!deck&&cloudMode&&<p role="status" className="lh-note">{!loaded.current
            ? '尚未載入雲端課程庫，請先解鎖教師驗證；這不代表課程已刪除。'
            : `固定教師課程庫已載入：${decks.length} 堂課。課程會保存在雲端，可於其他瀏覽器驗證後繼續備課。`}</p>}
          {error && (
            <p role="alert" className="lh-error">
              {error}
            </p>
          )}
          {!deck && <div className="lh-row">
            <select
              aria-label="選擇既有課程"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              <option value="">46 個原課程…</option>
              {lessons.current.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <button disabled={!lessonId||(cloudMode&&!loaded.current)} onClick={adapt}>
              建立相容課程副本
            </button>
            <span className="lh-note">原課程繼續由原 Lesson Flow 播放</span>
          </div>
          }
          {!deck && loaded.current && <ImageUpgrade decks={decks} onSaved={d => { version.current.set(d.id,d.version); setDecks(all => all.map(x => x.id===d.id?d:x)); }} />}
          {!deck ? (
            <div className="lh-library">
              {decks.map((d) => (
                <button key={d.id} onClick={() => select(d)}>
                  <small>
                    {d.blocks.length} 頁 · v{d.version}
                  </small>
                  <h2>{d.title}</h2>
                  <span>繼續備課 →</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="lh-row lh-toolbar">
                <button onClick={async () => {await saveQueue.current;if(!failedSave.current)setDeck(null);}}>課程庫</button>
                <label>
                  本堂課單人遊戲
                  <select
                    aria-label="本堂課單人遊戲"
                    value={deck.rewardGame || "basketball"}
                    onChange={(e) =>
                      setDeck({ ...deck, rewardGame: e.target.value })
                    }
                  >
                    {Object.entries(REWARD_GAMES).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <span role="status">{message}</span>
                {message==='儲存未完成'&&<button onClick={()=>setDeck({...deck})}>重試儲存</button>}
                <button
                  onClick={async () => {
                    try {
                      await saveQueue.current;
                      const { deck: old } = await api("previousDeck", null, {
                        id: deck.id,
                      });
                      setDeck({
                        ...old,
                        version: version.current.get(deck.id) || 0,
                      });
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  復原上一個儲存版本
                </button>
                <button
                  className="lh-primary"
                  onClick={async () => {
                    try {
                      await saveQueue.current;
                      if(failedSave.current)throw new Error('請先重試儲存，完成後再開始課堂。');
                      const active = await api("create", null, { deck });
                      sessionStorage.setItem(
                        "hub-lab-active-room",
                        active.code,
                      );
                      setRoom(active);
                      setError("");
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  檢查並開始 Teacher-led →
                </button>
              </div>
              <Editor key={deck.id} deck={deck} onChange={setDeck} />
            </>
          )}
        </>
      )}
    </div>
  );
}
