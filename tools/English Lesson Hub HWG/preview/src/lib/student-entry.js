const SAFE_PART = /^[a-z0-9-]+$/i;

export function parseStudentEntry(search = "") {
  const params = new URLSearchParams(search);
  if (params.get("mode") !== "student") return null;
  const bookId = String(params.get("book") || "").trim().toLowerCase();
  const unitId = String(params.get("unit") || "").trim().toLowerCase();
  const lessonNumber = Number(params.get("lesson"));
  if (!SAFE_PART.test(bookId) || !SAFE_PART.test(unitId) || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > 5) {
    return null;
  }
  return { bookId, unitId, lessonNumber };
}

export function normalizeStudentBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!/^https?:$/i.test(url.protocol)) return "";
    url.search = "";
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function isLoopbackBaseUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function resolveStudentBaseUrl({ origin, productionBaseUrl = "", localLanBaseUrl = "" }) {
  const current = normalizeStudentBaseUrl(origin);
  if (!current) return "";
  if (isLoopbackBaseUrl(current)) return normalizeStudentBaseUrl(localLanBaseUrl);
  return normalizeStudentBaseUrl(productionBaseUrl) || current;
}

export function buildStudentEntryUrl({ baseUrl, bookId, unitId, lessonNumber }) {
  const safeBase = normalizeStudentBaseUrl(baseUrl);
  if (!safeBase || !SAFE_PART.test(String(bookId || "")) || !SAFE_PART.test(String(unitId || ""))) return "";
  const lesson = Number(lessonNumber);
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > 5) return "";
  const url = new URL(safeBase);
  url.searchParams.set("mode", "student");
  url.searchParams.set("book", String(bookId).toLowerCase());
  url.searchParams.set("unit", String(unitId).toLowerCase());
  url.searchParams.set("lesson", String(lesson));
  return url.href;
}
