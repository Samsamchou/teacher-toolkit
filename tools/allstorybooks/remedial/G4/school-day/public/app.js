const STORY = {
  title: "School day",
  homeUrl: "../../../../index.html",
  requiredListens: 2,
  cover: {
    image: "assets/generated/school-day-cover.png",
    alt: "老師與兩位學生在溫暖教室開始一天課程的封面插畫",
  },
  completion: {
    image: "assets/generated/school-day-celebration.png",
    alt: "老師與兩位學生在教室慶祝讀完故事",
  },
  pages: [
    {
      image: "assets/pages/page-01.png",
      audio: "assets/audio/page-01.mp3",
      sentences: ["The bell rings."],
    },
    {
      image: "assets/pages/page-02.png",
      audio: "assets/audio/page-02.mp3",
      sentences: ["Are you ready?"],
    },
    {
      image: "assets/pages/page-03.png",
      audio: "assets/audio/page-03.mp3",
      sentences: ["Take out your book."],
    },
    {
      image: "assets/pages/page-04.png",
      audio: "assets/audio/page-04.mp3",
      sentences: ["Raise your hand."],
    },
    {
      image: "assets/pages/page-05.png",
      audio: "assets/audio/page-05.mp3",
      sentences: ["Put down your hand."],
    },
    {
      image: "assets/pages/page-06.png",
      audio: "assets/audio/page-06.mp3",
      sentences: ["Come here."],
    },
    {
      image: "assets/pages/page-07.png",
      audio: "assets/audio/page-07.mp3",
      sentences: ["Read this, please."],
    },
    {
      image: "assets/pages/page-08.png",
      audio: "assets/audio/page-08.mp3",
      sentences: ["Put away your book."],
    },
    {
      image: "assets/pages/page-09.png",
      audio: "assets/audio/page-09.mp3",
      sentences: ["It is break time."],
    },
    {
      image: "assets/pages/page-10.png",
      audio: "assets/audio/page-10.mp3",
      sentences: ["Let’s play."],
    },
    {
      image: "assets/pages/page-11.png",
      audio: "assets/audio/page-11.mp3",
      sentences: ["They run outside."],
    },
    {
      image: "assets/pages/page-12.png",
      audio: "assets/audio/page-12.mp3",
      sentences: ["The red ball rolls away."],
    },
  ],
};

const VIEW = {
  COVER: -1,
  COMPLETION: STORY.pages.length,
};

const elements = {
  paper: document.querySelector("#paper"),
  pageArt: document.querySelector("#pageArt"),
  pageVignette: document.querySelector("#pageVignette"),
  coverCopy: document.querySelector("#coverCopy"),
  completionCopy: document.querySelector("#completionCopy"),
  celebration: document.querySelector("#celebration"),
  startButton: document.querySelector("#startButton"),
  homeButton: document.querySelector("#homeButton"),
  soundButton: document.querySelector("#soundButton"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  pageCounter: document.querySelector("#pageCounter"),
  listenProgress: document.querySelector("#listenProgress"),
  listenProgressText: document.querySelector("#listenProgressText"),
  listenDots: [...document.querySelectorAll(".listen-progress__dots i")],
  readerStatus: document.querySelector("#readerStatus"),
  pageAudio: document.querySelector("#pageAudio"),
  topbarMeta: document.querySelector("#topbarMeta"),
};

let currentView = VIEW.COVER;
let isTurning = false;
let celebrationTimer = null;
let renderTimer = null;
let activePlaybackPage = null;
let listenCounts = STORY.pages.map(() => 0);

function createConfetti() {
  const colors = ["#ffd76a", "#ff87bd", "#7ee6ff", "#c7ff78", "#a890ff"];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 42; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.setProperty("--left", `${(index * 23 + 7) % 101}%`);
    piece.style.setProperty("--size", `${7 + (index % 5) * 2}px`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    piece.style.setProperty("--rotation", `${(index * 47) % 180}deg`);
    piece.style.setProperty("--drift", `${-70 + ((index * 37) % 140)}px`);
    piece.style.setProperty("--duration", `${3.2 + (index % 7) * 0.22}s`);
    piece.style.setProperty("--delay", `${(index % 10) * 0.1}s`);
    fragment.append(piece);
  }

  elements.celebration.replaceChildren(fragment);
}

function stopAudio() {
  elements.pageAudio.pause();
  elements.pageAudio.currentTime = 0;
  activePlaybackPage = null;
  elements.soundButton.disabled = false;
  elements.soundButton.classList.remove("is-playing");
  elements.soundButton.setAttribute("aria-pressed", "false");
}

async function playPageAudio() {
  if (
    currentView < 0 ||
    currentView >= STORY.pages.length ||
    !elements.pageAudio.paused
  ) {
    return;
  }

  const playbackPage = currentView;
  const page = STORY.pages[currentView];
  if (!elements.pageAudio.src.endsWith(page.audio)) {
    elements.pageAudio.src = page.audio;
  }
  elements.pageAudio.currentTime = 0;
  activePlaybackPage = playbackPage;
  elements.soundButton.disabled = true;

  try {
    await elements.pageAudio.play();
    elements.soundButton.classList.add("is-playing");
    elements.soundButton.setAttribute("aria-pressed", "true");
    const nextListen = Math.min(
      listenCounts[playbackPage] + 1,
      STORY.requiredListens,
    );
    elements.readerStatus.textContent =
      listenCounts[playbackPage] >= STORY.requiredListens
        ? `再次朗讀：${page.sentences.join(" ")}`
        : `正在播放第 ${nextListen} 次：${page.sentences.join(" ")}`;
  } catch {
    activePlaybackPage = null;
    elements.soundButton.disabled = false;
    elements.soundButton.classList.remove("is-playing");
    elements.readerStatus.textContent = "點一下左上角喇叭，即可播放本頁朗讀。";
  }
}

function updateListenProgress(index, { justCompleted = false } = {}) {
  const count = listenCounts[index];
  const unlocked = count >= STORY.requiredListens;
  elements.listenProgress.hidden = false;
  elements.listenProgressText.textContent = `${count} / ${STORY.requiredListens}`;
  elements.listenDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-complete", dotIndex < count);
  });

  elements.soundButton.setAttribute(
    "aria-label",
    unlocked
      ? "再聽一次本頁朗讀"
      : `播放本頁朗讀，第 ${count + 1} 次，共 ${STORY.requiredListens} 次`,
  );

  elements.nextButton.hidden = !unlocked;
  elements.nextButton.classList.remove("is-unlocked");
  if (unlocked && justCompleted) {
    void elements.nextButton.offsetWidth;
    elements.nextButton.classList.add("is-unlocked");
  }

  if (unlocked) {
    elements.readerStatus.textContent =
      index === STORY.pages.length - 1
        ? "已完整聽完兩次！右側箭頭已解鎖，可以完成閱讀。"
        : "已完整聽完兩次！右側箭頭已解鎖，可以前往下一頁。";
  } else if (count === 1) {
    elements.readerStatus.textContent =
      "已完整聽完第 1 次，再按一次喇叭聽完即可解鎖箭頭。";
  } else {
    elements.readerStatus.textContent =
      "請按左上角喇叭，完整聽完兩次後才會出現下一頁箭頭。";
  }
}

function clearCelebration() {
  window.clearTimeout(celebrationTimer);
  celebrationTimer = null;
  elements.celebration.classList.remove("is-active");
  elements.completionCopy.classList.remove("is-ready");
}

function beginCelebration() {
  clearCelebration();
  void elements.celebration.offsetWidth;
  elements.celebration.classList.add("is-active");
  elements.readerStatus.textContent = "閱讀完成！慶祝動畫播放中……";

  celebrationTimer = window.setTimeout(() => {
    elements.celebration.classList.remove("is-active");
    elements.completionCopy.classList.add("is-ready");
    elements.readerStatus.textContent = "太棒了！按「回到首頁」可以再讀一次。";
    elements.homeButton.focus({ preventScroll: true });
  }, 5000);
}

function renderCover() {
  stopAudio();
  clearCelebration();
  elements.pageArt.src = STORY.cover.image;
  elements.pageArt.alt = STORY.cover.alt;
  elements.pageVignette.classList.remove("is-hidden");
  elements.coverCopy.hidden = false;
  elements.completionCopy.hidden = true;
  elements.soundButton.hidden = true;
  elements.listenProgress.hidden = true;
  elements.previousButton.hidden = true;
  elements.nextButton.hidden = true;
  elements.pageCounter.hidden = true;
  elements.readerStatus.textContent = "按「開始閱讀」進入故事";
}

function renderStoryPage(index) {
  clearCelebration();
  const page = STORY.pages[index];
  elements.pageArt.src = page.image;
  elements.pageArt.alt = `第 ${index + 1} 頁：${page.sentences.join(" ")}`;
  elements.pageVignette.classList.add("is-hidden");
  elements.coverCopy.hidden = true;
  elements.completionCopy.hidden = true;
  elements.soundButton.hidden = false;
  elements.listenProgress.hidden = false;
  elements.previousButton.hidden = index === 0;
  elements.nextButton.setAttribute(
    "aria-label",
    index === STORY.pages.length - 1 ? "完成閱讀" : "下一頁",
  );
  elements.nextButton.title =
    index === STORY.pages.length - 1 ? "完成閱讀" : "下一頁";
  elements.pageCounter.hidden = false;
  elements.pageCounter.textContent = `${index + 1} / ${STORY.pages.length}`;
  elements.pageAudio.src = page.audio;
  updateListenProgress(index);
}

function renderCompletion() {
  stopAudio();
  elements.pageArt.src = STORY.completion.image;
  elements.pageArt.alt = STORY.completion.alt;
  elements.pageVignette.classList.add("is-hidden");
  elements.coverCopy.hidden = true;
  elements.completionCopy.hidden = false;
  elements.soundButton.hidden = true;
  elements.listenProgress.hidden = true;
  elements.previousButton.hidden = false;
  elements.nextButton.hidden = true;
  elements.pageCounter.hidden = true;
  beginCelebration();
}

function renderCurrentView() {
  if (currentView === VIEW.COVER) {
    renderCover();
    return;
  }

  if (currentView === VIEW.COMPLETION) {
    renderCompletion();
    return;
  }

  renderStoryPage(currentView);
}

function goTo(nextView) {
  if (
    isTurning ||
    nextView < VIEW.COVER ||
    nextView > VIEW.COMPLETION ||
    nextView === currentView
  ) {
    return;
  }

  stopAudio();
  clearCelebration();
  isTurning = true;
  const direction = nextView > currentView ? "next" : "previous";
  elements.paper.classList.add(`is-turning-${direction}`);

  renderTimer = window.setTimeout(() => {
    currentView = nextView;
    renderCurrentView();
  }, 250);

  elements.paper.addEventListener(
    "animationend",
    () => {
      window.clearTimeout(renderTimer);
      renderTimer = null;
      elements.paper.classList.remove("is-turning-next", "is-turning-previous");
      isTurning = false;
    },
    { once: true },
  );
}

function nextPage() {
  if (
    currentView >= 0 &&
    currentView < STORY.pages.length &&
    listenCounts[currentView] >= STORY.requiredListens
  ) {
    goTo(currentView + 1);
  }
}

function previousPage() {
  if (currentView > VIEW.COVER) {
    goTo(currentView - 1);
  }
}

function preloadAssets() {
  [
    ...STORY.pages.map((page) => page.image),
    STORY.completion.image,
  ].forEach((source) => {
    const image = new Image();
    image.src = source;
  });

  STORY.pages.forEach((page) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = page.audio;
  });
}

elements.startButton.addEventListener("click", () => goTo(0));
elements.homeButton.addEventListener("click", () => {
  window.location.href = STORY.homeUrl;
});
elements.soundButton.addEventListener("click", () => void playPageAudio());
elements.nextButton.addEventListener("click", nextPage);
elements.previousButton.addEventListener("click", previousPage);

elements.pageAudio.addEventListener("ended", () => {
  const completedPage = activePlaybackPage;
  activePlaybackPage = null;
  elements.soundButton.disabled = false;
  elements.soundButton.classList.remove("is-playing");
  elements.soundButton.setAttribute("aria-pressed", "false");
  if (
    completedPage !== null &&
    completedPage === currentView &&
    currentView >= 0 &&
    currentView < STORY.pages.length
  ) {
    listenCounts[currentView] = Math.min(
      listenCounts[currentView] + 1,
      STORY.requiredListens,
    );
    updateListenProgress(currentView, { justCompleted: true });
  }
});

elements.pageAudio.addEventListener("error", () => {
  activePlaybackPage = null;
  elements.soundButton.disabled = false;
  elements.soundButton.classList.remove("is-playing");
  elements.readerStatus.textContent = "朗讀音檔載入失敗，請重新整理後再試。";
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" && !elements.nextButton.hidden) {
    event.preventDefault();
    nextPage();
  } else if (event.key === "ArrowLeft" && !elements.previousButton.hidden) {
    event.preventDefault();
    previousPage();
  } else if (
    (event.key === " " || event.key.toLowerCase() === "r") &&
    currentView >= 0 &&
    currentView < STORY.pages.length &&
    event.target === document.body
  ) {
    event.preventDefault();
    void playPageAudio();
  }
});

createConfetti();
preloadAssets();
try {
  const queryStudentId = new URLSearchParams(window.location.search).get(
    "student",
  );
  if (/^\d{5}$/.test(queryStudentId ?? "")) {
    window.localStorage.setItem("storybookStudentId", queryStudentId);
  }
  const studentId = /^\d{5}$/.test(queryStudentId ?? "")
    ? queryStudentId
    : window.localStorage.getItem("storybookStudentId");
  if (studentId) {
    elements.topbarMeta.textContent = `學號 ${studentId} · 四年級 · ${STORY.title}`;
  }
} catch {
  // The reader still works if storage is unavailable.
}
renderCurrentView();
