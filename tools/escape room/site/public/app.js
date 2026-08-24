import { ASSETS, CONTENT_VERSION, FLOW_NODES, LOCKED_MISSIONS, MISSIONS, STORY } from "./data.js";
import { applyEnergy, scoreDelta } from "./game-rules.js";
import {
  attemptsToCsv,
  createAttempt,
  getActiveAttempt,
  listAttempts,
  saveAttempt,
  setActiveAttempt,
  summarizeAttempts,
} from "./storage.js";

const app = document.querySelector("#app");
const liveRegion = document.querySelector("#liveRegion");
const homeButton = document.querySelector("#homeButton");
const teacherButton = document.querySelector("#teacherButton");
const teacherDialog = document.querySelector("#teacherDialog");
const teacherPanel = document.querySelector("#teacherPanel");
const networkStatus = document.querySelector("#networkStatus");

let attempt = getActiveAttempt();
let feedback = null;
let selectedOption = null;
let explicitHome = false;
let activeSpeechButton = null;
let lastEnergyDelta = null;

const letters = ["A", "B", "C"];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function retinaAsset(path) {
  return String(path).replace(/\.webp$/i, "@2x.webp");
}

function announce(message) {
  liveRegion.textContent = "";
  window.setTimeout(() => { liveRegion.textContent = message; }, 30);
}

function updateNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? "守護站連線正常" : "離線模式｜進度仍會保留";
}

function iconSvg(name, extraClass = "") {
  const paths = {
    audio: '<path d="M5 10v4h3l4 3V7L8 10H5Z"/><path d="M15 9.5a4 4 0 0 1 0 5"/><path d="M17.5 7a7 7 0 0 1 0 10"/>',
    lock: '<rect x="6.5" y="10" width="11" height="9" rx="2"/><path d="M9 10V7.5a3 3 0 0 1 6 0V10"/>',
    current: '<circle cx="12" cy="12" r="7"/><path d="m12 8 1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2L12 8Z"/>',
    done: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    item: '<path d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7Z"/><path d="m5 8.5 7 3.5 7-3.5M12 12v7"/>',
  };
  return `<svg class="ui-icon ${escapeHtml(extraClass)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] ?? paths.item}</svg>`;
}

function audioButton(text, label = "朗讀英文") {
  return `<button class="audio-button" type="button" data-speak="${escapeHtml(text)}" aria-label="${escapeHtml(label)}" aria-pressed="false">${iconSvg("audio", "audio-icon")}</button>`;
}

function englishLine(text) {
  return `<div class="english-line">${audioButton(text)}<span lang="en">${escapeHtml(text)}</span></div>`;
}

function stopSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (activeSpeechButton) activeSpeechButton.setAttribute("aria-pressed", "false");
  activeSpeechButton = null;
}

function speak(text, button) {
  if (!("speechSynthesis" in window)) {
    announce("這台裝置目前無法播放朗讀，請直接閱讀畫面英文。");
    return;
  }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => /en-US/i.test(voice.lang)) ?? voices.find((voice) => /^en/i.test(voice.lang)) ?? null;
  utterance.onend = stopSpeech;
  utterance.onerror = stopSpeech;
  activeSpeechButton = button;
  button.setAttribute("aria-pressed", "true");
  window.speechSynthesis.speak(utterance);
}

function bindGlobalAudio(scope = document) {
  scope.querySelectorAll("[data-speak]").forEach((button) => {
    button.addEventListener("click", () => speak(button.dataset.speak, button));
  });
}

function glossaryHtml(entries) {
  return `<ul class="glossary">${entries.map(([en, zh]) => `<li>${audioButton(en, `朗讀 ${en}`)}<span><b lang="en">${escapeHtml(en)}</b>｜${escapeHtml(zh)}</span></li>`).join("")}</ul>`;
}

function answerRows() {
  return Object.values(attempt?.answers ?? {});
}

function progress() {
  const rows = answerRows();
  const main = rows.filter((row) => row.countsTowardMain18 && row.finalCorrect).length;
  const required = rows.filter((row) => row.finalCorrect).length;
  return { main, required };
}

function statusHtml() {
  const energyValue = Number.isFinite(Number(attempt.energy)) ? Number(attempt.energy) : 0;
  const energyFill = Math.max(0, Math.min(100, energyValue));
  const charged = energyValue >= 90;
  const deltaHtml = lastEnergyDelta === null
    ? ""
    : `<span class="energy-delta ${lastEnergyDelta >= 0 ? "positive" : "negative"}" aria-hidden="true">${lastEnergyDelta >= 0 ? "+" : ""}${lastEnergyDelta}</span>`;
  return `<section class="game-status hud-energy ${charged ? "is-charged" : ""}" aria-label="目前任務狀態">
    <div class="energy-console">
      <div class="energy-heading"><span>能量 <span lang="en">Energy</span></span><span class="energy-reading"><strong class="energy-value">${energyValue}</strong>${deltaHtml}</span></div>
      <div class="energy-meter" role="meter" aria-label="目前能量 ${energyValue}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${energyFill}" aria-valuetext="目前能量 ${energyValue}">
        <i class="energy-fill" style="width:${energyFill}%"></i>
      </div>
    </div>
    <div class="student-console"><span>守護隊員</span><strong>${escapeHtml(attempt.studentId)}</strong></div>
  </section>`;
}

function missionMapHtml(currentMission) {
  const completedMain = progress().main;
  return `<nav class="mission-map station-route" aria-label="六區任務地圖">${MISSIONS.map((mission) => {
    const done = completedMain >= mission.id * 3;
    const unlocked = mission.id === 1 || completedMain >= (mission.id - 1) * 3;
    const isCurrent = mission.id === currentMission && !done;
    const state = done ? "done" : isCurrent ? "current" : unlocked ? "ready" : "locked";
    const stateLabel = done ? "已完成" : isCurrent ? "目前位置" : unlocked ? "已解鎖" : "尚未解鎖";
    const stateIcon = done ? "done" : isCurrent || unlocked ? "current" : "lock";
    return `<div class="station ${state}" aria-label="${escapeHtml(mission.zh)}，${stateLabel}" ${isCurrent ? 'aria-current="step"' : ""}>
      <span class="station-state-icon">${iconSvg(stateIcon)}</span><b>${escapeHtml(mission.zh)}</b><span class="visually-hidden">${stateLabel}</span>
    </div>`;
  }).join("")}</nav>`;
}

function inventoryHtml() {
  return `<section class="mission-inventory inventory-tray" aria-label="任務物品欄">
    <div class="inventory-title"><span>任務物品</span><span lang="en">Mission Gear</span></div>
    <div class="inventory-slots">${MISSIONS.map((mission) => {
      const unlocked = attempt.unlockedItems.includes(mission.reward);
      return `<div class="inventory-slot ${unlocked ? "unlocked" : "locked"}" aria-label="${escapeHtml(mission.reward)}，${unlocked ? "已取得" : "尚未取得"}">
        ${unlocked ? `<img src="${mission.rewardImage}" alt="" />` : iconSvg("item")}
        <span lang="en">${escapeHtml(mission.reward)}</span>
      </div>`;
    }).join("")}</div>
  </section>`;
}

function shellHtml(content, currentMission = FLOW_NODES[attempt.currentNodeIndex]?.mission ?? 6) {
  return `<div class="game-shell">${statusHtml()}${missionMapHtml(currentMission)}${inventoryHtml()}${content}</div>`;
}

function renderHome() {
  lastEnergyDelta = null;
  stopSpeech();
  explicitHome = true;
  const active = getActiveAttempt();
  const resume = active ? `<section class="resume-banner">
    <p><strong>找到未完成紀錄</strong><br>學號 ${escapeHtml(active.studentId)}，<span lang="en">Energy</span> ${active.energy}。重新整理、旋轉或短暫離線都可接續。</p>
    <button id="resumeButton" class="primary-button" type="button">繼續本次作答</button>
  </section>` : "";

  app.innerHTML = `${resume}
    <section class="home-hero">
      <img class="hero-image" src="${ASSETS.homeHero}" alt="二水田野與交流任務的原創插圖" />
      <div class="hero-copy">
        <p class="eyebrow" lang="en">Welcome Route Rescue</p>
        <h1>用英文修復六座任務站</h1>
        <p>讀線索、選出正確問答、取得六個元件，最後開啟二水迎賓閘門。</p>
        ${audioButton("Welcome Route Rescue", "朗讀任務名稱")}
      </div>
      <form id="studentForm" class="login-card" novalidate>
        <label for="studentId"><strong>輸入學號</strong></label>
        <div class="login-row">
          <input id="studentId" name="studentId" inputmode="numeric" autocomplete="off" pattern="[0-9]{5,8}" maxlength="8" placeholder="例如 60101" value="${escapeHtml(active?.studentId ?? "")}" aria-describedby="studentHelp studentError" required />
          <button class="primary-button" type="submit">開始新紀錄</button>
        </div>
        <p id="studentHelp" class="form-note">開始一趟新的守護任務；未完成的這一趟仍可從上方接續。</p>
        <p id="studentError" class="form-note error-text" role="alert"></p>
      </form>
    </section>
    <div class="section-heading"><div><h2>任務目錄</h2><p>第一套任務已開放，其餘先保留入口。</p></div></div>
    <section class="mission-catalog" aria-label="任務目錄">
      <button id="openMissionCard" class="catalog-card" type="button">
        <img src="${ASSETS.openCard}" alt="八位虛構交流學生抵達二水車站的插圖" />
        <span class="card-title">HWG7 U01+02 情境任務</span><span class="card-state">守護路線已開放</span>
      </button>
      ${LOCKED_MISSIONS.map((name) => `<button class="catalog-card" type="button" disabled><img src="${ASSETS.lockedCard}" alt="尚未開放的任務入口插圖" /><span class="card-title">${escapeHtml(name)} 情境任務</span><span class="card-state">即將開放</span></button>`).join("")}
    </section>`;

  document.querySelector("#studentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#studentId");
    const studentId = input.value.trim();
    if (!/^\d{5,8}$/.test(studentId)) {
      document.querySelector("#studentError").textContent = "請輸入 5–8 位數字學號。";
      input.focus();
      return;
    }
    attempt = createAttempt(studentId, CONTENT_VERSION);
    explicitHome = false;
    feedback = null;
    renderStoryIntro();
  });
  document.querySelector("#openMissionCard").addEventListener("click", () => document.querySelector("#studentId").focus());
  document.querySelector("#resumeButton")?.addEventListener("click", () => {
    attempt = active;
    explicitHome = false;
    resumeAttempt();
  });
  bindGlobalAudio(app);
  app.focus();
}

function renderStoryIntro() {
  const content = `<section class="mission-intro">
    <div class="scene-panel"><img src="${ASSETS.missionMap}" alt="連接六個任務站的原創地圖插圖" /></div>
    <div class="mission-copy">
      <p class="eyebrow" lang="en">Mission Briefing</p>
      <h1>${escapeHtml(STORY.title)}</h1>
      ${STORY.english.map(englishLine).join("")}
      <h2><span lang="en">Mission</span> 難字</h2>${glossaryHtml(STORY.glossary)}

      <button id="beginStory" class="primary-button" type="button">前往第一座守護站</button>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, 1);
  document.querySelector("#beginStory").addEventListener("click", () => {
    attempt.storyIntroSeen = true;
    attempt = saveAttempt(attempt);
    renderMissionIntro(1);
  });
  bindGlobalAudio(app);
  app.focus();
}

function renderMissionIntro(missionId) {
  const mission = MISSIONS[missionId - 1];
  const content = `<section class="mission-intro">
    <div class="scene-panel"><img src="${mission.scene}" srcset="${mission.scene} 1x, ${retinaAsset(mission.scene)} 2x" alt="${escapeHtml(mission.zh)}的任務環境插圖" /></div>
    <div class="mission-copy">
      <p class="eyebrow" lang="en">Station Briefing</p>
      <h1>${escapeHtml(mission.zh)}</h1>
      <div class="english-line">${audioButton(mission.en)}<strong lang="en">${escapeHtml(mission.en)}</strong></div>
      ${mission.missionEnglish.map(englishLine).join("")}
      <h2><span lang="en">Mission</span> 難字</h2>${glossaryHtml(mission.glossary)}
      <p class="station-objective">讀懂線索、完成英文對話，讓這座守護站恢復運作。</p>
      <button id="beginMission" class="primary-button" type="button">開始本站任務</button>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, missionId);
  document.querySelector("#beginMission").addEventListener("click", () => {
    if (!attempt.missionIntroSeen.includes(missionId)) attempt.missionIntroSeen.push(missionId);
    attempt = saveAttempt(attempt);
    renderQuestion();
  });
  bindGlobalAudio(app);
  app.focus();
}

function currentNode() {
  return FLOW_NODES[attempt.currentNodeIndex];
}

function roleLabel(node) {
  if (node.type === "image") return "Picture Match";
  if (node.role === "power") return "Power Question";
  if (node.role === "bridge") return "Bridge Question";
  return "Core Question";
}

function nodeRecord(node) {
  return attempt.answers[node.id] ?? null;
}

function contextPanelHtml(node) {
  const contextEn = node.contextEn ?? node.context ?? "Check the mission clues.";
  const contextZh = node.contextZh ?? "守護站收到新的情境訊息，請先讀懂英文並觀察線索。";
  const missionGoalZh = node.missionGoalZh ?? "任務目標：找出能讓目前任務繼續前進的正確答案。";
  return `<section class="context-box mission-comms" aria-label="任務通訊">
    <div class="comms-heading"><span lang="en">Mission Comms</span><strong>守護站通訊</strong></div>
    <img class="comms-guide" src="assets/images/mascots/MASCOT-01.webp" alt="水水送來守護站任務訊息" />
    <div class="character-dialogue">
      <div class="context-en">${englishLine(contextEn)}</div>
      <p class="context-zh"><strong>情境：</strong>${escapeHtml(contextZh)}</p>
      <p class="mission-goal">${escapeHtml(missionGoalZh)}</p>
    </div>
  </section>`;
}

function renderQuestion() {
  const node = currentNode();
  if (!node) return renderFinale();
  const record = nodeRecord(node);
  const isDone = Boolean(record?.finalCorrect);
  const evidence = node.type === "choice"
    ? `<div class="evidence-frame evidence-scanner"><div class="scanner-heading"><span lang="en">Clue Scanner</span><strong>線索掃描器</strong></div><img src="${node.evidence}" alt="完成任務所需的角色與環境線索圖" /><div class="evidence-caption">先觀察圖片，再閱讀通訊內容。線索不會直接寫出答案。</div></div>`
    : "";

  const options = node.type === "image"
    ? `<div class="options image-options options--image image-options--full">${node.optionImages.map((image, index) => optionHtml(node, index, `<img src="${image}" alt="圖片選項 ${letters[index]}" />`)).join("")}</div>`
    : `<div class="options options--choice">${node.options.map((option, index) => `<div class="option-row">${optionHtml(node, index, `<span lang="en">${escapeHtml(option)}</span>`)}${audioButton(option, `朗讀選項 ${letters[index]}`)}</div>`).join("")}</div>`;

  const content = `<section class="question-card question-card--${node.type}" data-question-layout="${node.type}">
    <div class="question-layout question-layout--${node.type}">
      ${evidence}
      <div class="question-stage">
        <span class="question-role ${node.role}" lang="en">${roleLabel(node)}</span>
        ${contextPanelHtml(node)}
        <div class="question-prompt">
          <h1 class="question-title" lang="en">${escapeHtml(node.prompt)}</h1>
          ${audioButton(node.prompt, "朗讀題目")}
        </div>
        ${options}
        <div id="feedbackArea">${feedbackHtml(node, record)}</div>
        <div class="question-actions">
          <button id="homeFromGame" class="ghost-button" type="button">返回首頁（保留本次進度）</button>
          ${isDone ? `<button id="nextNode" class="primary-button" type="button">${attempt.currentNodeIndex === FLOW_NODES.length - 1 ? "完成終極解鎖" : "前往下一步"}</button>` : ""}
        </div>
      </div>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, node.mission);

  app.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(Number(button.dataset.option)));
  });
  document.querySelector("#homeFromGame").addEventListener("click", renderHome);
  document.querySelector("#nextNode")?.addEventListener("click", advanceNode);
  bindGlobalAudio(app);
  app.focus();
}

function optionHtml(node, index, content) {
  const record = nodeRecord(node);
  const done = Boolean(record?.finalCorrect);
  const classes = ["option-button", "game-answer-card", node.type === "image" ? "image-option" : ""];
  if (done && index === node.answer) classes.push("correct");
  else if (!done && feedback?.type === "error" && selectedOption === index) classes.push("wrong");
  return `<button class="${classes.join(" ")}" type="button" data-option="${index}" ${done ? "disabled" : ""}>
    <span class="option-letter">${letters[index]}</span>${content}
  </button>`;
}

function feedbackHtml(node, record) {
  if (!feedback && !record?.finalCorrect && !record?.attemptCount) return "";
  if (record?.finalCorrect || feedback?.type === "success") {
    return `<section class="feedback success character-dialogue" role="status">
      <img src="${ASSETS.mascotCorrect}" alt="水水開心確認答案" />
      <div><h3>答對了！</h3>${englishLine(node.explanation)}<p>${escapeHtml(node.languageTip)}</p><p class="state-change" lang="en">${escapeHtml(node.stateChange)}</p>${audioButton(node.stateChange, "朗讀故事狀態")}</div>
    </section>`;
  }
  const attempts = record?.attemptCount ?? 1;
  const hint = node.hints[Math.min(attempts - 1, node.hints.length - 1)];
  return `<section class="feedback error character-dialogue" role="alert">
    <img src="${ASSETS.mascotRetry}" alt="水水提醒再看一次線索" />
    <div><h3>再觀察一次</h3>${englishLine("Look again. You can do it!")}${englishLine(hint)}<p>已扣 3 <span lang="en">Energy</span>；<span lang="en">Energy</span> 歸零仍可繼續作答。</p></div>
  </section>`;
}

function answerQuestion(index) {
  const node = currentNode();
  const existing = nodeRecord(node);
  if (existing?.finalCorrect) return;
  selectedOption = index;
  const count = (existing?.attemptCount ?? 0) + 1;
  const correct = index === node.answer;
  const affectsEnergy = node.type !== "image";
  const delta = scoreDelta(count, correct, affectsEnergy);
  lastEnergyDelta = affectsEnergy ? delta : null;
  attempt.energy = applyEnergy(attempt.energy, delta);
  const nextRecord = {
    questionId: node.id,
    questionRole: node.role,
    contentTags: node.mission <= 3 ? ["country", "sentence-pattern"] : ["transport", "sentence-pattern"],
    attemptCount: count,
    firstTryCorrect: correct && count === 1,
    finalCorrect: correct,
    hintLevelUsed: correct ? (existing?.hintLevelUsed ?? 0) : Math.min(count, node.hints.length),
    energyDelta: (existing?.energyDelta ?? 0) + delta,
    answeredAt: new Date().toISOString(),
    countsTowardMain18: node.type === "choice",
    affectsEnergy,
  };
  attempt.answers[node.id] = nextRecord;
  attempt = saveAttempt(attempt);
  feedback = { type: correct ? "success" : "error" };
  announce(correct ? "答對了，請閱讀解析。" : "答案不正確，請查看提示並再試一次。");
  renderQuestion();
}

function unlockMissionReward(missionId) {
  const mission = MISSIONS[missionId - 1];
  if (!attempt.unlockedItems.includes(mission.reward)) attempt.unlockedItems.push(mission.reward);
  attempt.pendingRewardMission = missionId;
  if (missionId === 6) attempt.finalStage = "key";
  attempt = saveAttempt(attempt);
  renderReward(missionId);
}

function advanceNode() {
  const node = currentNode();
  const oldMission = node.mission;
  lastEnergyDelta = null;
  attempt.currentNodeIndex += 1;
  feedback = null;
  selectedOption = null;
  const next = currentNode();
  const missionFinished = !next || next.mission !== oldMission;
  attempt = saveAttempt(attempt);
  if (missionFinished) unlockMissionReward(oldMission);
  else renderQuestion();
}

function renderReward(missionId) {
  const mission = MISSIONS[missionId - 1];
  const isFinalKey = missionId === 6;
  const content = `<section class="reward-card reward-burst">
    <img src="${mission.rewardImage}" alt="${escapeHtml(mission.reward)} 任務元件插圖" />
    <div>
      <p class="eyebrow" lang="en">Station Restored</p>
      <h1>取得 <span lang="en">${escapeHtml(mission.reward)}</span></h1>
      ${englishLine(`You found the ${mission.reward}.`)}
      <p>${isFinalKey ? "水路鑰匙已插入最後一個插槽。接著把六個元件組成最終通行證。" : '這個元件會真正投入最後的 <span lang="en">Welcome Gate</span> 解鎖。'}</p>
      <div class="unlocked-list">${attempt.unlockedItems.map((item) => `<span class="unlocked-chip" lang="en">${escapeHtml(item)}</span>`).join("")}</div>
      <button id="rewardNext" class="primary-button" type="button">${isFinalKey ? '組成 <span lang="en">Final Welcome Pass</span>' : "前往下一座守護站"}</button>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, missionId);
  document.querySelector("#rewardNext").addEventListener("click", () => {
    if (isFinalKey) {
      attempt.finalStage = "pass";
      if (!attempt.unlockedItems.includes("Final Welcome Pass")) attempt.unlockedItems.push("Final Welcome Pass");
      attempt = saveAttempt(attempt);
      renderFinalPass();
      return;
    }
    attempt.pendingRewardMission = null;
    attempt = saveAttempt(attempt);
    renderMissionIntro(missionId + 1);
  });
  bindGlobalAudio(app);
  app.focus();
}

function renderFinalPass() {
  const content = `<section class="reward-card reward-burst">
    <img src="${ASSETS.finalPass}" alt="由六個任務元件組成的最終迎賓通行證" />
    <div><p class="eyebrow" lang="en">Final Assembly</p><h1><span lang="en">Final Welcome Pass</span> 完成</h1>
      ${englishLine("All six mission powers are connected.")}
      ${englishLine("Open the Welcome Gate.")}
      <p>你的英文回答讓六個故事狀態真的改變，而不是只累積分數。</p>
      <button id="openGate" class="primary-button" type="button">開啟 <span lang="en">Welcome Gate</span></button>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, 6);
  document.querySelector("#openGate").addEventListener("click", () => {
    attempt.status = "completed";
    attempt.completedAt = new Date().toISOString();
    attempt.pendingRewardMission = null;
    attempt.finalStage = "gate";
    attempt = saveAttempt(attempt);
    setActiveAttempt(null);
    renderFinale();
  });
  bindGlobalAudio(app);
  app.focus();
}

function renderFinale() {
  const content = `<section class="finale-card">
    <img src="${ASSETS.openGate}" srcset="${ASSETS.openGate} 1x, ${retinaAsset(ASSETS.openGate)} 2x" alt="迎賓閘門開啟，八位虛構交流學生與水水在二水田野前慶祝" />
    <div class="finale-copy">
      <p class="eyebrow" lang="en">Mission Complete</p>
      <h1><span lang="en">Welcome Gate</span> 已開啟！</h1>
      ${englishLine("The welcome route is ready.")}
      ${englishLine("You read, checked, corrected, and tried again.")}
      <div class="reflection-box"><strong lang="en">Reflection</strong><p>哪一題讓你重新看線索後才找到答案？你用了哪一個英文句型改變故事？</p></div>
      <p>最終能量 <span lang="en">Energy</span>：<strong>${attempt?.energy ?? 0}</strong></p>
      <button id="backToCatalog" class="primary-button" type="button">返回任務目錄</button>
    </div>
  </section>`;
  app.innerHTML = shellHtml(content, 6);
  document.querySelector("#backToCatalog").addEventListener("click", () => {
    attempt = null;
    renderHome();
  });
  bindGlobalAudio(app);
  app.focus();
}

function resumeAttempt() {
  if (!attempt) return renderHome();
  if (!attempt.storyIntroSeen) return renderStoryIntro();
  if (attempt.pendingRewardMission) {
    if (attempt.pendingRewardMission === 6 && attempt.finalStage === "pass") return renderFinalPass();
    return renderReward(attempt.pendingRewardMission);
  }
  const node = currentNode();
  if (!node) return renderFinalPass();
  if (!attempt.missionIntroSeen.includes(node.mission)) return renderMissionIntro(node.mission);
  renderQuestion();
}

function renderTeacherLogin() {
  teacherPanel.innerHTML = `<section class="teacher-login">
    <h1 id="teacherTitle">教師後台</h1>
    <p class="demo-notice"><strong>安全邊界：</strong>正式六碼必須由 Firebase 後端驗證。目前尚未設定正式專案、Secret 或 Security Rules，因此本機第一版不會假裝驗證成功。</p>
    <form id="teacherLoginForm">
      <label for="teacherCode"><strong>六碼教師通行碼</strong></label>
      <input id="teacherCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="部署階段由教師設定" />
      <p id="teacherMessage" class="error-text" role="alert"></p>
      <button class="secondary-button" type="submit">正式登入（尚未連線）</button>
    </form>
    <hr />
    <button id="openMockReport" class="primary-button" type="button">檢視本機測試報表</button>
  </section>`;
  document.querySelector("#teacherLoginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelector("#teacherMessage").textContent = "尚未連接安全後端，沒有任何六碼會在開發版中被接受或保存。";
  });
  document.querySelector("#openMockReport").addEventListener("click", renderMockReport);
}

function renderMockReport() {
  const attempts = listAttempts();
  const summary = summarizeAttempts(attempts);
  teacherPanel.innerHTML = `<section>
    <h1 id="teacherTitle">本機測試報表</h1>
    <p class="demo-notice">此頁只讀取本裝置 localStorage 測試紀錄，不是 Firebase 全班資料，也沒有通過正式教師驗證。</p>
    <div class="report-metrics">
      <div class="metric"><span>歷次 attempt</span><strong>${summary.attempts}</strong></div>
      <div class="metric"><span>完成率</span><strong>${summary.completionRate}%</strong></div>
      <div class="metric"><span>首次答對率</span><strong>${summary.firstTryRate}%</strong></div>
      <div class="metric"><span>最終答對率</span><strong>${summary.finalCorrectRate}%</strong></div>
    </div>
    <button id="downloadCsv" class="primary-button" type="button" ${attempts.length ? "" : "disabled"}>匯出測試 CSV</button>
    <div class="report-table-wrap"><table><thead><tr><th>學號</th><th>狀態</th><th>開始時間</th><th lang="en">Energy</th><th>主題題</th><th>節點</th></tr></thead>
      <tbody>${attempts.length ? attempts.slice().reverse().map((item) => {
        const rows = Object.values(item.answers ?? {});
        const main = rows.filter((row) => row.countsTowardMain18 && row.finalCorrect).length;
        const required = rows.filter((row) => row.finalCorrect).length;
        return `<tr><td>${escapeHtml(item.studentId)}</td><td>${escapeHtml(item.status)}</td><td>${new Date(item.startedAt).toLocaleString("zh-TW")}</td><td>${item.energy}</td><td>${main}/18</td><td>${required}/21</td></tr>`;
      }).join("") : `<tr><td colspan="6">尚無本機測試紀錄。</td></tr>`}</tbody></table></div>
  </section>`;
  document.querySelector("#downloadCsv")?.addEventListener("click", () => {
    const blob = new Blob(["\uFEFF", attemptsToCsv(attempts)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ershui-mission-test-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

homeButton.addEventListener("click", () => {
  stopSpeech();
  renderHome();
});
teacherButton.addEventListener("click", () => {
  stopSpeech();
  renderTeacherLogin();
  teacherDialog.showModal();
});
teacherDialog.addEventListener("close", stopSpeech);
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
window.addEventListener("pagehide", () => { if (attempt?.status === "in_progress") saveAttempt(attempt); });

updateNetworkStatus();
if (attempt && !explicitHome) resumeAttempt();
else renderHome();
