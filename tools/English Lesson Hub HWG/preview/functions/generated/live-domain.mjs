// Shared v2 domain. No Firebase v1 reads or writes.
import { REWARD_GAMES, rewardAllowance, rewardView } from "./rewards.mjs";
import { requiresMastery, masteryPassed } from './mastery.mjs';
import { newCanvas, validateCanvas } from './slide-canvas.mjs';
import { videoSource, blockVideoTrim, clampVideoPosition, videoPosition, videoClipEnded } from './video.mjs';
import { validateAnnotations } from './annotations.mjs';
import { validateParity, publicParity, gradeParity, textLength, OPEN_LIMIT, inlineTypes } from './parity.mjs';
export const TYPES = Object.freeze({
  slide: "教材投影片",
  choice: "選擇題",
  multiselect: "多項選擇題",
  blank: "填空題",
  drag: "拖放",
  label: "標籤",
  hotspot: "熱點",
  draw: "塗鴉",
  order: "重新排序",
  category: "分類",
  dropdown: "下拉選單",
  cloud: "文字雲",
  open: "開放式作答",
  audio: "錄音＋AI",
  vowel: "點選母音拼讀字母",
});
export const copy = (value) => JSON.parse(JSON.stringify(value));
export function fail(message) {
  throw new Error(message);
}
export function identifier(value) {
  return typeof value === "string" && /^[\w-]{1,100}$/.test(value);
}
export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}
export function embedUrl(input) {
  if (!input) return "";
  const video=videoSource(input);if(video)return video.url;
  let u;
  try {
    u = new URL(input);
  } catch {
    fail("請貼上完整 HTTPS 網址。");
  }
  if (u.protocol !== "https:" || u.username || u.password)
    fail("嵌入網址必須是 HTTPS。");
  if (
    u.hostname === "docs.google.com" &&
    /^\/presentation\/d\/(?:e\/)?[\w-]+\/(?:pubembed|embed|edit|pub)/.test(
      u.pathname,
    )
  ) {
    u.pathname = u.pathname.replace(
      /\/(edit|pub)$/,
      "/" + (u.pathname.includes("/d/e/") ? "pubembed" : "embed"),
    );
    u.search = "";
    u.hash = "";
    return u.href;
  }
  if (
    ["www.canva.com", "canva.com"].includes(u.hostname) &&
    /^\/design\/[\w-]+(?:\/[\w-]+)?\/view$/.test(u.pathname)
  ) {
    u.search = "?embed";
    u.hash = "";
    return u.href;
  }
  fail("只接受 YouTube、Google Drive 影片、Google Slides 或 Canva 的 HTTPS 播放連結。");
}
export function newBlock(type = "slide", id = globalThis.crypto.randomUUID()) {
  if (!TYPES[type]) fail("不支援此題型。");
  return {
    id,
    type,
    title:
      type === "slide"
        ? "今天一起學習"
        : type === "vowel"
          ? "點選每個單字的母音拼讀字母"
          : "請回答這一題",
    text: "",
    notes: "",
    hidden: false,
    points: 1,
    seconds: 0,
    font: "comic",
    layout: "split",
    fontSize: 36,
    color: "#17324d",
    options: ["Monday", "Tuesday", "Wednesday"],
    answer: [0],
    alternatives: ["Taiwan"],
    items: ["Monday", "Tuesday", "Wednesday"],
    groups: ["Weekday", "Weekend"],
    mapping: [0, 0, 0],
    zones: [
      { x: 0.25, y: 0.5, w: 0.2, h: 0.18 },
      { x: 0.65, y: 0.5, w: 0.2, h: 0.18 },
    ],
    media: [],
    embed: "",
    focusRule: "請清楚完整朗讀句子。",
    partial: true,
    multiple: false,
    ungraded: false,
    ...(type === 'slide' ? { slideCanvas: newCanvas() } : {}),
    ...(type === "vowel"
      ? {
          vowelWords: Array.from({ length: 3 }, () => ({
            word: "",
            imageId: "",
            targets: [],
          })),
          partial: false,
        }
      : {}),
  };
}
export function validateDeck(deck, { draft = false } = {}) {
  if (
    deck?.rewardGame !== undefined &&
    !Object.hasOwn(REWARD_GAMES, deck.rewardGame)
  )
    fail("請選擇有效的課間遊戲。");
  if (
    !identifier(deck?.id) ||
    typeof deck.title !== "string" ||
    !deck.title.trim() ||
    deck.title.length > 200
  )
    fail("課程標題或識別碼不正確。");
  if (
    !Array.isArray(deck.blocks) ||
    !deck.blocks.length ||
    deck.blocks.length > 80
  )
    fail("課程需要 1–80 張投影片。");
  if (new Set(deck.blocks.map((b) => b.id)).size !== deck.blocks.length)
    fail("投影片識別碼重複。");
  for (const b of deck.blocks) {
    if (!draft && b.hidden && b.conversionPending) { validateDeck({ ...deck, blocks: [b] }, { draft: true }); continue; }
    if (!draft && !b.hidden && b.conversionPending) fail('轉換題目需先確認題幹、正解與選項。');
    if (!draft && !b.hidden && b.questionCanvas && b.type === 'choice' && (!Array.isArray(b.answer) || !b.answer.length || (!b.multiple && b.answer.length !== 1) || b.options?.some(v => typeof v !== 'string' || !v.trim()) || new Set(b.options?.map(normalize)).size !== b.options?.length)) fail('轉換選擇題需填寫不同的選項並設定正解。');
    if(b.type==='multiselect'&&b.modelVersion!==3)fail('多項選擇題需要新版模型。');
    validateParity(b, { draft: draft || b.hidden });
    if (!identifier(b.id) || !TYPES[b.type]) fail("投影片格式不正確。");
    if (!Number.isFinite(b.points) || b.points < 0 || b.points > 100)
      fail("配分必須是 0–100。");
    if (!Number.isFinite(b.seconds) || b.seconds < 0 || b.seconds > 3600)
      fail("計時必須是 0–3600 秒。");
    if (b.type === "slide" && b.embed) embedUrl(b.embed);
    if (b.slideCanvas !== undefined) { if (b.type !== 'slide') fail('教材畫布只能用於投影片。'); validateCanvas(b.slideCanvas, b.media, embedUrl); }
    if (b.questionCanvas !== undefined) { if (b.type === 'slide') fail('學生題幹只能用於題目。'); validateCanvas(b.questionCanvas, b.media, embedUrl); }
    if (b.syncVideoId && (b.type !== 'slide' || typeof b.syncVideoId !== 'string' || !b.media?.some(m => m.id === b.syncVideoId && m.kind === 'video') || videoSource(b.embed))) fail('同步影片需選取本頁影片，且不能同時指定外部影片。');
    if (b.objects !== undefined) {
      if (
        !Array.isArray(b.objects) ||
        b.objects.length > 30 ||
        new Set(b.objects.map((o) => o.id)).size !== b.objects.length
      )
        fail("畫布最多 30 個不重複物件。");
      for (const o of b.objects) {
        if (
          !identifier(o.id) ||
          !["text", "image"].includes(o.kind) ||
          ["x", "y", "w", "h"].some(
            (k) => !Number.isFinite(o[k]) || o[k] < 0 || o[k] > 100,
          ) ||
          typeof o.text !== "string" ||
          o.text.length > 4000
        )
          fail("畫布物件設定無效。");
      }
    }
    if (!Array.isArray(b.media) || b.media.length > 12)
      fail("每頁最多 12 個媒體。");
    if (
      ["choice", "dropdown"].includes(b.type) && !(b.modelVersion === 3 && b.type === 'dropdown') &&
      (!Array.isArray(b.options) ||
        b.options.length < 2 ||
        b.options.length > 6 ||
        b.answer?.some(
          (i) => !Number.isInteger(i) || i < 0 || i >= b.options.length,
        ))
    )
      fail("選項或答案設定不正確。");
    if (
      ["drag", "label", "category"].includes(b.type) && !(b.modelVersion === 3 && ['drag','label'].includes(b.type)) &&
      (!b.items?.length ||
        b.mapping?.length !== b.items.length ||
        b.mapping.some(
          (i) =>
            !Number.isInteger(i) ||
            i < 0 ||
            i >= (b.type === "category" ? b.groups.length : b.zones.length),
        ))
    )
      fail("每個項目都必須指定有效的目標。");
    if (b.type === "blank" && b.modelVersion !== 3 && !b.alternatives?.some((a) => normalize(a)))
      fail("請設定填空答案。");
    if (b.type === "audio" && !b.text.trim()) fail("錄音題必須設定目標句。");
    if (b.type === "vowel") {
      if (!Array.isArray(b.vowelWords) || b.vowelWords.length !== 3)
        fail("母音題必須設定恰好三個單字與圖片。");
      const images = new Set();
      for (const entry of b.vowelWords) {
        const word = entry?.word;
        if (
          typeof word !== "string" ||
          !/^[A-Za-z ]{0,24}$/.test(word) ||
          (!draft && word.replace(/ /g, '').length < 2)
        )
          fail("母音題每格需填入單字或片語：至少 2 個英文字母，含空格最多 24 字元。");
        if (b.ungraded) fail("母音題完成後必須計入學習成績。");
        if (
          typeof entry.imageId !== "string" ||
          (!draft && !entry.imageId) ||
          (entry.imageId &&
            !b.media.some((m) => m.id === entry.imageId && m.kind === "image"))
        )
          fail("母音題每個單字都需要對應圖片。");
        if (entry.imageId) images.add(entry.imageId);
        if (
          !Array.isArray(entry.targets) ||
          (!draft && !entry.targets.length) ||
          new Set(entry.targets).size !== entry.targets.length ||
          entry.targets.some(
            (i) => !Number.isInteger(i) || i < 0 || i >= word.length || word[i] === ' ',
          )
        )
          fail("母音題每個單字都要標記有效的答案字母位置。");
      }
      if (!draft && images.size !== 3)
        fail("母音題需要三張不同的對應圖片。");
    }
  }
  if (JSON.stringify(deck).length > 200000)
    fail("教材設定太大；媒體須使用檔案引用。");
  return deck;
}
export function publicBlock(block, reveal = false) {
  if (block.modelVersion === 3) return publicParity(block, reveal);
  const {
    answer,
    alternatives,
    mapping,
    notes,
    focusRule,
    displayItems,
    vowelWords,
    ...safe
  } = copy(block);
  if (safe.slideCanvas) delete safe.slideCanvas.original;
  if (safe.questionCanvas) delete safe.questionCanvas.original;
  if (block.type !== "slide") delete safe.embed;
  if (block.type === "order") safe.items = copy(displayItems || block.items);
  if (block.type === 'order' && reveal) safe.correctOrder=copy(block.items);
  if (block.type === "vowel")
    safe.vowelWords = vowelWords.map(({ targets, ...word }) =>
      reveal ? { ...word, targets } : word,
    );
  if (reveal) Object.assign(safe, { answer, alternatives, mapping });
  return safe;
}
export function grade(block, response) {
  if (block.type === 'multiselect') return gradeParity(block, response);
  if (block.modelVersion === 3) {
    if(block.type === 'choice' && (!Array.isArray(response) || !response.length || (!block.multiple && response.length !== 1))) fail('請選擇有效數量的選項。');
    if(block.type === 'category' && (!Array.isArray(response) || response.some(v=>!Number.isInteger(v)||v<0||v>=block.groups.length))) fail('請完成每個項目的分類。');
    if(block.type === 'order' && (!Array.isArray(response) || JSON.stringify([...response].sort())!==JSON.stringify([...block.items].sort()))) fail('排序項目必須各使用一次。');
    const result = gradeParity(block, response);
    if (result) return result;
  }
  const max = block.points;
  if (block.type === "cloud" || block.ungraded)
    return { status: "ungraded", score: null, max: 0 };
  if (["open", "draw", "audio"].includes(block.type))
    return { status: "pending", score: null, max };
  let ratio = 0;
  if (block.type === "blank")
    ratio = block.alternatives.some((a) => normalize(a) === normalize(response))
      ? 1
      : 0;
  else if (block.type === "hotspot") {
    if (
      !response ||
      !Number.isFinite(response.x) ||
      !Number.isFinite(response.y)
    )
      fail("請點選圖片位置。");
    ratio = block.zones.some(
      (z) =>
        response.x >= z.x &&
        response.x <= z.x + z.w &&
        response.y >= z.y &&
        response.y <= z.y + z.h,
    )
      ? 1
      : 0;
  } else if (block.type === "vowel") {
    if (
      !Array.isArray(response) ||
      response.length !== 3 ||
      response.some(
        (selected, wi) =>
          !Array.isArray(selected) ||
          new Set(selected).size !== selected.length ||
          selected.some(
            (i) =>
              !Number.isInteger(i) ||
              i < 0 ||
              i >= block.vowelWords[wi].word.length ||
              block.vowelWords[wi].word[i] === ' ',
          ),
      )
    )
      fail("母音題答案位置無效。");
    ratio = response.every(
      (selected, wi) =>
        selected.length === block.vowelWords[wi].targets.length &&
        selected.every((i) => block.vowelWords[wi].targets.includes(i)),
    )
      ? 1
      : 0;
  } else if (block.type === "choice" || block.type === "dropdown") {
    const selected = Array.isArray(response) ? response : [response];
    if (
      selected.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= block.options.length,
      ) ||
      new Set(selected).size !== selected.length
    )
      fail("選項無效。");
    const right = selected.filter((i) => block.answer.includes(i)).length;
    ratio = Math.max(
      0,
      (right - (selected.length - right)) / Math.max(1, block.answer.length),
    );
  } else {
    const expected = block.type === "order" ? block.items : block.mapping;
    if (!Array.isArray(response) || response.length !== expected.length)
      fail("請完成全部項目。");
    ratio =
      expected.filter((v, i) => v === response[i]).length / expected.length;
  }
  if (!block.partial) ratio = ratio === 1 ? 1 : 0;
  return { status: "graded", score: Math.round(max * ratio * 100) / 100, max,
    ...(block.modelVersion === 3 ? {scoringVersion:'parity-1',details: (block.type === 'order' ? block.items : block.type === 'category' ? block.mapping : block.answer).map((v,i)=>({id:String(i),correct:block.type === 'choice' ? (Array.isArray(response)?response:[response]).includes(v) : response[i]===v}))} : {}) };
}
export function createRoom(deck, code, teacher, now = Date.now()) {
  validateDeck(deck);
  const blocks = copy(deck.blocks.filter((b) => !b.hidden));
  for (const b of blocks)
    if (b.type === "order") {
      b.displayItems = [...b.items];
      for (let i = b.displayItems.length - 1; i > 0; i--) {
        const bytes = new Uint32Array(1);
        globalThis.crypto.getRandomValues(bytes);
        const j = bytes[0] % (i + 1);
        [b.displayItems[i], b.displayItems[j]] = [
          b.displayItems[j],
          b.displayItems[i],
        ];
      }
    }
  if (!blocks.length) fail("至少需要一張可見投影片。");
  return {
    schemaVersion: 2,
    code,
    teacher,
    deck: { ...copy(deck), blocks },
    revision: 1,
    phase: "lobby",
    index: 0,
    reveal: false,
    openedAt: null,
    createdAt: now,
    expiresAt: now + 12 * 3600000,
    participants: {},
    responses: {},
    vowelProgress: {},
    ink: [],
    events: [],
  };
}
function checkRoom(room, now) {
  if (!room || room.expiresAt < now) fail("加入碼不存在或已到期。");
}
export function joinRoom(room, uid, studentId, now = Date.now()) {
  checkRoom(room, now);
  if (room.phase === "complete") fail("這堂課已結束。");
  if (!/^\d{5}$/.test(studentId)) fail("請輸入五位數學號。");
  if (
    Object.entries(room.participants).some(
      ([id, p]) => id !== uid && p.studentId === studentId,
    )
  )
    fail("學號已在課堂中，請由教師解除舊連線後再加入。");
  if (room.participants[uid] && room.participants[uid].studentId !== studentId)
    fail("請勿在同一工作階段切換學號。");
  if (!room.participants[uid] && Object.keys(room.participants).length >= 40)
    fail("本堂課人數已滿。");
  room.participants[uid] ??= { studentId, joinedAt: now };
  room.participants[uid].lastSeen = now;
  return room;
}
export function controlRoom(
  room,
  teacher,
  action,
  payload = {},
  now = Date.now(),
) {
  checkRoom(room, now);
  if (room.teacher !== teacher) fail("需要本堂課教師權限。");
  if (payload.revision !== room.revision) fail("課堂已更新，請重讀後操作。");
  if (room.phase === "complete" && action !== "grade") fail("這堂課已結束。");
  const b = room.deck.blocks[room.index];
  switch (action) {
    case "focus": {
      if (typeof payload.enabled !== 'boolean' || (payload.blockId && payload.blockId !== b.id)) fail('專注模式指令無效。');
      if (payload.enabled) {
        if (room.phase === 'lobby') fail('請先開始上課。');
        if (b.type !== 'slide' && room.phase !== 'paused') {
          room.resumePhase = room.phase; room.pausedAt = now; room.phase = 'paused';
        }
        room.focus = true;
      } else {
        if (room.phase === 'paused') {
          if (room.resumePhase === 'question') room.pausedDuration = (room.pausedDuration || 0) + now - room.pausedAt;
          room.phase = room.resumePhase || 'content';
        }
        room.focus = false;
      }
      break;
    }
    case "video": {
      if (b.type !== 'slide' || room.phase !== 'content') fail('目前頁面不可同步播放。');
      if (b.syncVideoId ? (payload.assetId !== b.syncVideoId || !b.media.some(m => m.id === b.syncVideoId && m.kind === 'video')) : (payload.assetId || videoSource(b.embed)?.provider !== 'youtube')) fail('影片來源已變更或不可同步。');
      if (payload.blockId !== b.id || !['play','pause','seek'].includes(payload.command) || !Number.isFinite(payload.position) || payload.position < 0 || payload.position > 86400) fail('影片指令無效。');
      if (payload.command === 'play') room.focus = true;
      const trim = blockVideoTrim(b);
      const position = trim && payload.command === 'play' && payload.position >= trim.end ? trim.start : clampVideoPosition(payload.position, trim);
      room.video = {blockId:b.id,assetId:b.syncVideoId||null,position,playing:(!trim || position < trim.end) && (payload.command==='play'||(payload.command==='seek'&&room.video?.playing===true)),updatedAt:now,sequence:(room.video?.sequence||0)+1};
      break;
    }
    case "start":
      room.focus = false;
      room.phase = "content";
      break;
    case "move":
      if (
        !Number.isInteger(payload.index) ||
        payload.index < 0 ||
        payload.index >= room.deck.blocks.length
      )
        fail("頁碼無效。");
      room.index = payload.index;
      room.openedAt=room.openedBlocks?.[room.deck.blocks[room.index].id]??Object.values(room.responses).filter(r=>r.blockId===room.deck.blocks[room.index].id).sort((a,b)=>b.openedAt-a.openedAt)[0]?.openedAt??null;
      room.phase = "content";
      room.reveal = false;
      room.ink = [];
      room.video = null;
      room.focus = false;
      break;
    case "open":
      room.focus = false;
      if (b.type === "slide") fail("教材頁不需要開題。");
      room.phase = "question";
      room.openedAt = now;
      room.openedBlocks={...(room.openedBlocks||{}),[b.id]:now};
      room.pausedDuration = 0;
      room.reveal = false;
      break;
    case "lock":
      room.phase = "locked";
      break;
    case "pause":
      if(room.video) room.video={...room.video,position:videoPosition(room.video,now,blockVideoTrim(b)),playing:false,updatedAt:now,sequence:room.video.sequence+1};
      if (room.phase === "paused") fail("課堂已暫停。");
      room.resumePhase = room.phase;
      room.pausedAt = now;
      room.phase = "paused";
      break;
    case "resume":
      if (room.phase !== "paused") fail("課堂並未暫停。");
      if (room.resumePhase === "question")
        room.pausedDuration = (room.pausedDuration || 0) + now - room.pausedAt;
      room.phase = room.resumePhase || "content";
      room.focus = false;
      break;
    case "reveal":
      room.reveal = true;
      room.phase = "locked";
      break;
    case "ink":
      if (
        !Array.isArray(payload.ink) ||
        JSON.stringify(payload.ink).length > 80000
      )
        fail("標註太大。");
      room.ink = copy(payload.ink);
      break;
    case "annotate": {
      if(payload.blockId!==b.id)fail('題目已切換，請重新標註。');
      validateAnnotations(payload.lines);
      const next={...(room.annotations||{}),[b.id]:copy(payload.lines)};
      if(JSON.stringify(next).length>200000)fail('本堂課標註已達上限，請先清除部分題目的標註。');
      room.annotations=next;
      break;
    }
    case "remove":
      delete room.participants[payload.uid];
      break;
    case "grade": {
      const r = room.responses[payload.attemptId];
      if (
        !r ||
        !["open", "draw", "audio"].includes(
          room.deck.blocks.find((b) => b.id === r.blockId)?.type,
        )
      )
        fail("無法人工評分這份作答。");
      if (
        !Number.isFinite(payload.score) ||
        payload.score < 0 ||
        payload.score > r.grade.max
      )
        fail("分數超出範圍。");
      const previousReward = Math.max(
        r.rewardGranted || 0,
        rewardAllowance(
          room.deck.blocks.find((b) => b.id === r.blockId),
          r,
        ),
      );
      r.grade = {
        ...r.grade,
        status: "graded",
        score: payload.score,
        manual: true,
      };
      r.override =
        typeof payload.pass === "boolean"
          ? payload.pass
          : payload.score === r.grade.max;
      if (r.ai) r.passed = r.override || r.best >= 80;
      r.rewardGranted = Math.max(
        previousReward,
        rewardAllowance(
          room.deck.blocks.find((b) => b.id === r.blockId),
          r,
        ),
      );
      break;
    }
    case "end":
      room.phase = "complete";
      room.completedAt = now;
      break;
    default:
      fail("不支援的課堂操作。");
  }
  room.revision++;
  return room;
}
export function submitRoom(room, uid, input, now = Date.now(), trustedVowel = false) {
  checkRoom(room, now);
  if (!room.participants[uid]) fail("請先加入課堂。");
  if (!identifier(input.attemptId)) fail("作答識別碼無效。");
  const prior = Object.values(room.responses).find(r => r.attemptId === input.attemptId);
  if (prior) {
    if (
      prior.uid !== uid ||
      prior.blockId !== input.blockId ||
      JSON.stringify(prior.answer) !== JSON.stringify(input.answer)
    )
      fail("重送內容衝突。");
    return prior;
  }
  const b = room.deck.blocks[room.index];
  if (
    room.phase !== "question" || room.reveal ||
    input.blockId !== b.id ||
    input.revision !== room.revision
  )
    fail("老師已關閉或切換題目，請等候下一步。");
  if (
    !requiresMastery(b) && b.seconds &&
    now > room.openedAt + (room.pausedDuration || 0) + b.seconds * 1000
  )
    fail("作答時間已結束。");
  if (
    input.answer === undefined ||
    input.answer === null ||
    JSON.stringify(input.answer).length > 60000
  )
    fail("答案內容無效或太大。");
  if (
    b.type === "draw" && b.modelVersion !== 3 &&
    (!Array.isArray(input.answer) ||
      !input.answer.length ||
      input.answer.length > 200 ||
      input.answer.some(
        (line) =>
          !Array.isArray(line) ||
          line.some(
            (p) =>
              !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite),
          ),
      ))
  )
    fail("繪圖資料無效。");
  if (b.type === 'draw' && b.modelVersion === 3 && (!Array.isArray(input.answer) || !input.answer.length || input.answer.length > 200 || input.answer.some(line => !line || !/^#[a-f0-9]{6}$/i.test(line.color) || ![3,6,18].includes(line.width) || !Array.isArray(line.points) || !line.points.length || line.points.length > 2500 || line.points.some(p=>!Array.isArray(p)||p.length!==2||p.some((n,i)=>!Number.isFinite(n)||n<0||n>[1000,600][i]))))) fail('繪圖資料無效。');
  if (b.type === "audio") fail("AI 評分服務尚未啟用；此題目前只能預覽。");
  if (b.type === "vowel" && !trustedVowel)
    fail("請逐一點選字母；此題不能直接提交答案。");
  const previousAttempts = Object.values(room.responses).filter(
    r => r.uid === uid && r.blockId === b.id && r.openedAt === room.openedAt,
  );
  if (previousAttempts.some(r => !requiresMastery(b) || masteryPassed(b, r)))
    fail(requiresMastery(b) ? '本題已交卷且全部答對，請進入遊戲。' : '這次開題已交卷。');
  if (
    ["open", "cloud"].includes(b.type) &&
    (typeof input.answer !== 'string' || !input.answer.trim() || textLength(input.answer) > (b.type === 'open' ? OPEN_LIMIT : 100))
  )
    fail(`請輸入 1–${b.type === 'open' ? OPEN_LIMIT : 100} 字元。`);
  const response = {
    attemptId: input.attemptId,
    uid,
    studentId: room.participants[uid].studentId,
    blockId: b.id,
    answer: copy(input.answer),
    grade: grade(b, input.answer),
    submittedAt: now,
    openedAt: room.openedAt,
    ...(requiresMastery(b) ? {
      attemptNumber: Math.max(0, ...previousAttempts.map(r => r.attemptNumber || 1)) + 1,
      ...(b.type !== 'vowel' ? { storageId: `mastery-${encodeURIComponent(uid)}-${b.id}-${room.openedAt}` } : {}),
    } : {}),
  };
  // Keep one live retry record per student/question. Existing historical rows
  // remain intact; repeated mistakes cannot grow a room past its read limit.
  if (response.storageId) for (const [id, old] of Object.entries(room.responses))
    if (old.storageId === response.storageId) delete room.responses[id];
  room.responses[input.attemptId] = response;
  if (!["open", "draw", "audio", "cloud"].includes(b.type))
    response.rewardPass =
      grade({ ...b, ungraded: false, points: 100 }, input.answer).score === 100;
  response.rewardGranted = rewardAllowance(b, response);
  return response;
}
export function tapVowel(room, uid, input, now = Date.now()) {
  checkRoom(room, now);
  if (!room.participants[uid]) fail("請先加入課堂。");
  const block = room.deck.blocks[room.index];
  if (
    block.type !== "vowel" ||
    room.phase !== "question" || room.reveal ||
    input.blockId !== block.id ||
    input.revision !== room.revision
  )
    fail("老師已關閉或切換題目，請等候下一步。");
  const { wordIndex, letterIndex } = input;
  if (
    !Number.isInteger(wordIndex) ||
    wordIndex < 0 ||
    wordIndex >= 3 ||
    !Number.isInteger(letterIndex) ||
    letterIndex < 0 ||
    letterIndex >= block.vowelWords[wordIndex].word.length ||
    block.vowelWords[wordIndex].word[letterIndex] === ' '
  )
    fail("字母位置無效。");
  const prior = room.vowelProgress?.[uid];
  const progress =
    prior?.blockId === block.id && prior.openedAt === room.openedAt
      ? copy(prior)
      : {
          blockId: block.id,
          openedAt: room.openedAt,
          selected: [[], [], []],
          attemptId: globalThis.crypto.randomUUID(),
          version: 0,
          complete: false,
        };
  if (progress.complete)
    return {
      correct: progress.selected[wordIndex].includes(letterIndex),
      complete: true,
    };
  const selected = progress.selected[wordIndex];
  const correct = block.vowelWords[wordIndex].targets.includes(letterIndex);
  if (correct && !selected.includes(letterIndex)) {
    selected.push(letterIndex);
    selected.sort((a, b) => a - b);
    progress.version++;
  }
  if (
    correct &&
    block.vowelWords.every((word, wi) =>
      word.targets.every((i) => progress.selected[wi].includes(i)),
    )
  ) {
    submitRoom(
      room,
      uid,
      {
        attemptId: progress.attemptId,
        blockId: block.id,
        revision: room.revision,
        answer: progress.selected,
      },
      now,
      true,
    );
    progress.complete = true;
  }
  room.vowelProgress ??= {};
  room.vowelProgress[uid] = progress;
  return { correct, complete: progress.complete,
    ...(!correct ? { feedback: { attemptId: globalThis.crypto.randomUUID(), outcome: 'wrong', mastery: true } } : {}),
  };
}
export function snapshot(room, uid, now = Date.now()) {
  checkRoom(room, now);
  const teacher = uid === room.teacher;
  if (!teacher && !room.participants[uid]) fail("請先加入課堂。");
  if (room.participants[uid]) room.participants[uid].lastSeen = now;
  const trim = blockVideoTrim(room.deck.blocks[room.index]);
  const safe = {
    code: room.code,
    title: room.deck.title,
    revision: room.revision,
    phase: room.phase,
    focus: room.focus === true,
    index: room.index,
    count: room.deck.blocks.length,
    reveal: room.reveal,
    openedAt: room.openedAt,
    rewardGame: room.deck.rewardGame || "basketball",
    ink: room.ink,
    annotations: copy(room.annotations?.[room.deck.blocks[room.index].id]||[]),
    video: room.video && videoClipEnded(room.video, now, trim) ? { ...room.video, position: trim.end, playing: false, updatedAt: now } : room.video || null,
    serverNow: now,
    block: teacher
      ? copy(room.deck.blocks[room.index])
      : publicBlock(room.deck.blocks[room.index], room.reveal),
    vowelProgress: teacher
      ? undefined
      : room.vowelProgress?.[uid]?.blockId === room.deck.blocks[room.index].id &&
          room.vowelProgress[uid].openedAt === room.openedAt
        ? {
            selected: copy(room.vowelProgress[uid].selected),
            version: room.vowelProgress[uid].version,
            complete: room.vowelProgress[uid].complete,
            completedWords: room.deck.blocks[room.index].type === "vowel"
              ? room.deck.blocks[room.index].vowelWords.map((word, wi) =>
                  word.targets.every((i) =>
                    room.vowelProgress[uid].selected[wi].includes(i),
                  ),
                )
              : undefined,
          }
        : null,
  };
  const responses = Object.values(room.responses)
    .sort((a,b) => a.submittedAt - b.submittedAt || (a.attemptNumber || 0) - (b.attemptNumber || 0))
    .filter((r) => teacher || r.uid === uid)
    .map((r) => {
      const value = copy(r);
      delete value.storageId;
      if (!teacher && !room.reveal && room.phase !== "complete")
        value.grade = { status: value.grade.status };
      return value;
    });
  return {
    ...safe,
    teacher,
    wordCloud: room.deck.blocks[room.index].type === 'cloud' && (teacher || room.reveal) ? (()=>{const counts=new Map();for(const r of Object.values(room.responses).filter(r=>r.blockId===room.deck.blocks[room.index].id&&r.openedAt===room.openedAt)){const word=normalize(r.answer);counts.set(word,(counts.get(word)||0)+1);}return [...counts].map(([text,count])=>({text,count})).sort((a,b)=>b.count-a.count);})() : null,
    reward: teacher ? undefined : rewardView(room, uid),
    responses,
    participants: teacher
      ? Object.entries(room.participants).map(([id, p]) => ({
          uid: id,
          ...p,
          online: now - p.lastSeen < 20000,
        }))
      : undefined,
  };
}
export function report(room) {
  return Object.entries(room.participants).map(([uid, p]) => {
    const responses = Object.values(room.responses).filter(
      (r) => r.uid === uid,
    );
    const latest = new Map();
    for (const r of responses.sort((a, b) => a.submittedAt - b.submittedAt))
      latest.set(r.blockId, r);
    const graded = [...latest.values()].filter(
      (r) => r.grade.status === "graded",
    );
    return {
      studentId: p.studentId,
      details: [...latest.values()].map(r=>({blockId:r.blockId,type:room.deck.blocks.find(b=>b.id===r.blockId)?.type,modelVersion:room.deck.blocks.find(b=>b.id===r.blockId)?.modelVersion || 2,scoringVersion:r.grade.scoringVersion || 'legacy-2',answer:copy(r.answer),grade:copy(r.grade)})),
      gameScore: rewardView(room, uid).score,
      gameTurns: rewardView(room, uid).used,
      submitted: latest.size,
      pending: [...latest.values()].filter((r) => r.grade.status === "pending")
        .length,
      score: graded.reduce((n, r) => n + r.grade.score, 0),
      max: graded.reduce((n, r) => n + r.grade.max, 0),
    };
  });
}
