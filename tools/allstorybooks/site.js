const STORAGE_KEY = "storybookStudentId";

function readStudentId() {
  const query = new URLSearchParams(window.location.search).get("student");
  if (/^\d{5}$/.test(query ?? "")) {
    try {
      window.localStorage.setItem(STORAGE_KEY, query);
    } catch {
      // Continue without persistent storage.
    }
    return query;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return /^\d{5}$/.test(stored ?? "") ? stored : "";
  } catch {
    return "";
  }
}

function saveStudentId(studentId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, studentId);
  } catch {
    // The portal remains usable when storage is unavailable.
  }
}

function setupPortal() {
  const form = document.querySelector("#studentForm");
  const input = document.querySelector("#studentId");
  const message = document.querySelector("#studentMessage");
  const menu = document.querySelector("#gradeMenu");
  const welcome = document.querySelector("#studentWelcome");
  const sectionMessage = document.querySelector("#sectionMessage");

  function revealMenu(studentId, { announce = true } = {}) {
    saveStudentId(studentId);
    input.value = studentId;
    message.textContent = "";
    welcome.textContent = `學號 ${studentId}`;
    menu.hidden = false;
    if (announce) {
      menu.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector('[data-section="remedial"]').focus({
        preventScroll: true,
      });
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const studentId = input.value.trim();
    if (!/^\d{5}$/.test(studentId)) {
      menu.hidden = true;
      message.textContent = "請輸入正確的 5 位數學號，例如 40100。";
      input.focus();
      return;
    }
    revealMenu(studentId);
  });

  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 5);
    message.textContent = "";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const studentId = input.value.trim();
      if (button.dataset.section === "remedial") {
        window.location.href = `remedial/index.html?student=${encodeURIComponent(studentId)}`;
        return;
      }
      const grade = button.dataset.section === "grade5" ? "五年級" : "六年級";
      sectionMessage.textContent = `${grade}繪本正在準備中，請先閱讀「學扶」繪本。`;
    });
  });

  const savedStudentId = readStudentId();
  if (savedStudentId) {
    revealMenu(savedStudentId, { announce: false });
  } else {
    input.focus();
  }
}

function setupRemedialLibrary() {
  const studentId = readStudentId();
  const studentChip = document.querySelector("#studentChip");
  studentChip.textContent = studentId ? `學號 ${studentId}` : "尚未輸入學號";

  document.querySelectorAll(".book-launch").forEach((link) => {
    if (studentId) {
      const url = new URL(link.getAttribute("href"), window.location.href);
      url.searchParams.set("student", studentId);
      link.href = url.href;
    }
  });
}

if (document.body.dataset.page === "portal") {
  setupPortal();
} else if (document.body.dataset.page === "remedial") {
  setupRemedialLibrary();
}
