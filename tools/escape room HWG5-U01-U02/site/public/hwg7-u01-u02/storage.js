// Local autosave (localStorage). One active attempt per student id; finished attempts move to history.
// Every access is guarded: private mode or blocked storage must not break the game.
const PREFIX = "hwg7-worldmap:v1:";

export function createStore(backend = globalThis.localStorage) {
  const ok = (() => {
    try {
      const k = `${PREFIX}probe`;
      backend.setItem(k, "1");
      backend.removeItem(k);
      return true;
    } catch { return false; }
  })();
  const read = key => {
    try { const raw = backend.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const write = (key, value) => {
    try { backend.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  };
  return {
    available: ok,
    load(studentId) {
      const s = read(`${PREFIX}${studentId}`);
      return s && s.studentId === studentId && !s.completedAt ? s : null;
    },
    save(state) {
      state.updatedAt = new Date().toISOString();
      return write(`${PREFIX}${state.studentId}`, state);
    },
    finish(state) {
      state.completedAt = new Date().toISOString();
      const history = read(`${PREFIX}${state.studentId}:history`) || [];
      history.push(state);
      const saved = write(`${PREFIX}${state.studentId}:history`, history.slice(-10));
      try { backend.removeItem(`${PREFIX}${state.studentId}`); } catch { /* ignore */ }
      return saved;
    },
    history(studentId) { return read(`${PREFIX}${studentId}:history`) || []; },
  };
}

export function newAttempt(studentId, now = new Date()) {
  return {
    studentId,
    attemptId: `${studentId}-${now.getTime().toString(36)}`,
    startedAt: now.toISOString(),
    stepIndex: 0,
    items: {},     // seq -> { attempts, wrong, firstTryCorrect, hintUsed, finalCorrect, quality, placed }
    listened: {},  // seg -> "ended" | "fallback"
    battles: {},   // id -> { status, quality, rewards }
    inventory: [], // reward names in the order earned
  };
}
