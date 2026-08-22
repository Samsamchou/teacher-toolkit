(function () {
  "use strict";

  const TEACHER_SESSION_KEY = "hwg7.teacherSession.v1";
  let appCheckEnabled = false;

  function hasPublicConfig(config) {
    return Boolean(config?.apiKey && config?.projectId && config?.appId);
  }

  function configure({ firebaseConfig, appCheckSiteKey }) {
    if (!hasPublicConfig(firebaseConfig) || !window.firebase?.initializeApp) return { firebaseReady: false, appCheckEnabled: false };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const EnterpriseProvider = window.firebase?.appCheck?.ReCaptchaEnterpriseProvider;
    if (appCheckSiteKey && typeof EnterpriseProvider === "function") {
      firebase.appCheck().activate(new EnterpriseProvider(appCheckSiteKey), true);
      appCheckEnabled = true;
    }
    return { firebaseReady: true, appCheckEnabled };
  }

  async function appCheckToken() {
    if (!appCheckEnabled || !window.firebase?.appCheck) return "";
    const result = await firebase.appCheck().getToken(false);
    return String(result?.token || "");
  }

  function teacherToken() {
    try {
      return sessionStorage.getItem(TEACHER_SESSION_KEY) || "";
    } catch {
      return "";
    }
  }

  function setTeacherToken(token) {
    if (!/^[A-Za-z0-9_-]{40,120}$/u.test(String(token || ""))) throw new Error("教師登入工作階段格式不正確。");
    sessionStorage.setItem(TEACHER_SESSION_KEY, token);
  }

  function clearTeacherToken() {
    try { sessionStorage.removeItem(TEACHER_SESSION_KEY); } catch { /* session-only fallback */ }
  }

  async function post(path, body, { signal, teacher = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    const checkToken = await appCheckToken();
    if (checkToken) headers["X-Firebase-AppCheck"] = checkToken;
    if (teacher) {
      const token = teacherToken();
      if (!token) {
        const error = new Error("請先登入教師後台。");
        error.code = "teacher_session_required";
        error.status = 401;
        throw error;
      }
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || "服務暫時無法完成，請稍後再試。");
      error.status = response.status;
      error.code = payload.error?.code || "request_failed";
      error.retryAfterSeconds = payload.error?.retryAfterSeconds || null;
      if (response.status === 401 && teacher) clearTeacherToken();
      throw error;
    }
    return payload;
  }

  function requestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  async function startGame({ unitId, students }) {
    return post("/api/game/start", { unitId, students, requestId: requestId() });
  }

  async function abandonGame(gameSessionId) {
    return post("/api/game/abandon", { gameSessionId });
  }

  async function completeGame(gameSessionId, result) {
    return post("/api/game/complete", { gameSessionId, result });
  }

  async function teacherLogin(passcode) {
    const payload = await post("/api/teacher/login", { passcode });
    setTeacherToken(payload.teacherSessionToken);
    return payload;
  }

  async function teacherAction(action, values = {}) {
    return post("/api/teacher", { action, ...values }, { teacher: true });
  }

  async function teacherRecording(attemptId, { signal } = {}) {
    const token = teacherToken();
    if (!token) {
      const error = new Error("請先登入教師後台。");
      error.code = "teacher_session_required";
      error.status = 401;
      throw error;
    }
    const headers = {
      "Content-Type": "application/json",
      Accept: "audio/*",
      Authorization: `Bearer ${token}`,
    };
    const checkToken = await appCheckToken();
    if (checkToken) headers["X-Firebase-AppCheck"] = checkToken;
    const response = await fetch("/api/teacher/recording", {
      method: "POST",
      headers,
      body: JSON.stringify({ attemptId }),
      signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.message || "錄音服務暫時無法提供，請稍後再試。");
      error.status = response.status;
      error.code = payload.error?.code || "recording_request_failed";
      if (response.status === 401) clearTeacherToken();
      throw error;
    }
    const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();
    if (!contentType.startsWith("audio/")) {
      const error = new Error("錄音格式不正確，請稍後再試。");
      error.status = 503;
      error.code = "recording_content_type_invalid";
      throw error;
    }
    return response.blob();
  }
  async function teacherLogout() {
    try {
      if (teacherToken()) await teacherAction("logout");
    } finally {
      clearTeacherToken();
    }
  }

  window.HWG7AppApi = {
    configure,
    post,
    startGame,
    abandonGame,
    completeGame,
    teacherLogin,
    teacherAction,
    teacherRecording,
    teacherLogout,
    hasTeacherSession: () => Boolean(teacherToken()),
    clearTeacherToken,
  };
})();