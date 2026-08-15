const MIN = -5;
const MAX = 5;
const TARGET_COUNT = 10;
const GAME_SECONDS = 60;

const board = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const timerElement = document.querySelector("#timer");
const timerCard = document.querySelector(".timer-card");
const form = document.querySelector("#guess-form");
const input = document.querySelector("#guess");
const message = document.querySelector("#message");
const restartButton = document.querySelector("#restart");

let targets = new Set();
let found = new Set();
let score = 0;
let timeLeft = GAME_SECONDS;
let timerId = null;
let gameActive = false;

function keyFor(x, y) {
  return `${x},${y}`;
}

function randomTargets() {
  const result = new Set();
  while (result.size < TARGET_COUNT) {
    const x = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    const y = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    result.add(keyFor(x, y));
  }
  return result;
}

function renderBoard() {
  board.replaceChildren();

  const corner = document.createElement("div");
  corner.className = "axis-label";
  corner.textContent = "y/x";
  board.append(corner);

  for (let x = MIN; x <= MAX; x += 1) {
    const label = document.createElement("div");
    label.className = "axis-label";
    label.textContent = x;
    label.setAttribute("aria-hidden", "true");
    board.append(label);
  }

  for (let y = MAX; y >= MIN; y -= 1) {
    const label = document.createElement("div");
    label.className = "axis-label";
    label.textContent = y;
    label.setAttribute("aria-hidden", "true");
    board.append(label);

    for (let x = MIN; x <= MAX; x += 1) {
      const cell = document.createElement("div");
      const key = keyFor(x, y);
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `座標 ${x}, ${y}`);
      if (found.has(key)) cell.classList.add("hit");
      board.append(cell);
    }
  }
}

function updateStatus() {
  scoreElement.textContent = `${score} / ${TARGET_COUNT}`;
  timerElement.textContent = timeLeft;
  timerCard.classList.toggle("warning", timeLeft <= 10);
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function stopGame(finalMessage) {
  gameActive = false;
  window.clearInterval(timerId);
  timerId = null;
  input.disabled = true;
  form.querySelector("button").disabled = true;
  setMessage(finalMessage, "done");
}

function tick() {
  timeLeft -= 1;
  updateStatus();
  if (timeLeft <= 0) {
    stopGame(`時間到！ Time's up! 你的分數是 ${score} / ${TARGET_COUNT}。`);
  }
}

function startGame() {
  window.clearInterval(timerId);
  targets = randomTargets();
  found = new Set();
  score = 0;
  timeLeft = GAME_SECONDS;
  gameActive = true;
  input.disabled = false;
  form.querySelector("button").disabled = false;
  renderBoard();
  updateStatus();
  setMessage("準備好了嗎？輸入一個座標開始狩獵！", "");
  input.value = "";
  input.focus();
  timerId = window.setInterval(tick, 1000);
}

function handleGuess(event) {
  event.preventDefault();
  if (!gameActive) return;

  const match = input.value.match(/^\s*(-?\d+)\s*,\s*(-?\d+)\s*$/);
  if (!match) {
    setMessage("格式不對！請輸入像 2,-3 這樣的座標。", "error");
    input.focus();
    return;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  const key = keyFor(x, y);

  if (x < MIN || x > MAX || y < MIN || y > MAX) {
    setMessage("超出棋盤範圍！x 和 y 都要在 -5 到 5 之間。", "error");
  } else if (found.has(key)) {
    setMessage("這個座標已經找過了，再試一個！", "error");
  } else if (targets.has(key)) {
    found.add(key);
    score += 1;
    const cell = board.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    cell?.classList.add("hit");
    updateStatus();
    if (score === TARGET_COUNT) {
      stopGame(`全部找到！You found them all! 得分 ${score} / ${TARGET_COUNT}。`);
    } else {
      setMessage(`命中！Hit! 還有 ${TARGET_COUNT - score} 個目標。`, "success");
    }
  } else {
    setMessage("沒有命中，再試試看！Miss — try again!", "error");
  }

  input.value = "";
  input.focus();
}

form.addEventListener("submit", handleGuess);
restartButton.addEventListener("click", startGame);
startGame();
