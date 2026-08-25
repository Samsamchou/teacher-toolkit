const DANGEROUS_MARKUP = /<\s*(?:script|object|embed|form|base|meta|link)\b|\bsrcdoc\s*=|\son[a-z]+\s*=|javascript\s*:/i;
const IFRAME_TAG = /<iframe\b/gi;
const IFRAME_OPENING_TAG = /<iframe\b[^>]*>/i;
const IFRAME_SRC = /\bsrc\s*=\s*(["'])(.*?)\1/i;
const DEFAULT_IFRAME_ALLOW = "fullscreen";
const TRUSTED_SPEAKING_IFRAME_ALLOW = "microphone *; fullscreen *";
const TRUSTED_SPEAKING_PRACTICE_ORIGINS = new Set([
  "https://setencerevieworalpractice.web.app"
]);

function hostMatches(hostname, domain) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return host === domain || host.endsWith("." + domain);
}

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#x2f;/gi, "/");
}

function readHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return { error: "只接受 HTTPS 連結。" };
    if (url.username || url.password) return { error: "連結不可包含帳號或密碼。" };
    return { url };
  } catch {
    return { error: "請貼入完整且有效的 HTTPS 連結。" };
  }
}

function isTrustedSpeakingPracticeUrl(url) {
  return TRUSTED_SPEAKING_PRACTICE_ORIGINS.has(url.origin);
}

function iframePermissionsFor(url) {
  return isTrustedSpeakingPracticeUrl(url)
    ? TRUSTED_SPEAKING_IFRAME_ALLOW
    : DEFAULT_IFRAME_ALLOW;
}

function isKnownEmbedUrl(url) {
  const host = url.hostname.toLowerCase();
  if (isTrustedSpeakingPracticeUrl(url)) return true;
  if (hostMatches(host, "wayground.com") || hostMatches(host, "quizizz.com")) return true;
  if (hostMatches(host, "canva.com")) {
    return url.searchParams.has("embed") || /\/(?:embed|embedded)(?:\/|$)/i.test(url.pathname);
  }
  if (host.startsWith("embed.")) return true;
  if (/\/(?:embed|embedded)(?:\/|$)/i.test(url.pathname)) return true;
  for (const [key, value] of url.searchParams.entries()) {
    if (/embed/i.test(key) || /^(?:embed|embedded)$/i.test(value)) return true;
  }
  return false;
}

function platformFor(url) {
  if (isTrustedSpeakingPracticeUrl(url)) return "Sentence Review Oral Practice";
  if (hostMatches(url.hostname, "canva.link") || hostMatches(url.hostname, "canva.com")) return "Canva";
  if (hostMatches(url.hostname, "wayground.com") || hostMatches(url.hostname, "quizizz.com")) return "Wayground";
  return url.hostname;
}

function invalid(message) {
  return {
    kind: "invalid",
    url: "",
    platform: "",
    inputType: "invalid",
    trustedSpeakingPractice: false,
    iframeAllow: DEFAULT_IFRAME_ALLOW,
    message
  };
}

export function parseWebPracticeInput(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return {
      kind: "empty",
      url: "",
      platform: "",
      inputType: "empty",
      trustedSpeakingPractice: false,
      iframeAllow: DEFAULT_IFRAME_ALLOW,
      message: "可貼入公開分享網址、Embed URL 或完整 iframe code。"
    };
  }

  if (raw.includes("<")) {
    if (DANGEROUS_MARKUP.test(raw)) return invalid("Embed code 含有不允許的程式或事件屬性。");
    const iframeMatches = raw.match(IFRAME_TAG) || [];
    if (iframeMatches.length !== 1 || !/<\/iframe\s*>/i.test(raw)) {
      return invalid("Embed code 必須包含且只能包含一個完整 iframe。");
    }
    const openingTag = raw.match(IFRAME_OPENING_TAG)?.[0] || "";
    const source = openingTag.match(IFRAME_SRC)?.[2];
    if (!source) return invalid("Embed code 找不到 iframe 的 src。");
    const parsed = readHttpsUrl(decodeHtmlAttribute(source));
    if (parsed.error) return invalid(parsed.error);
    const trustedSpeakingPractice = isTrustedSpeakingPracticeUrl(parsed.url);
    return {
      kind: "embed",
      url: parsed.url.toString(),
      platform: platformFor(parsed.url),
      inputType: "iframe",
      trustedSpeakingPractice,
      iframeAllow: iframePermissionsFor(parsed.url),
      message: "將在 Lesson Hub 頁內嵌入；仍保留新分頁備援。"
    };
  }

  const parsed = readHttpsUrl(raw);
  if (parsed.error) return invalid(parsed.error);
  const kind = isKnownEmbedUrl(parsed.url) ? "embed" : "external";
  const trustedSpeakingPractice = isTrustedSpeakingPracticeUrl(parsed.url);
  return {
    kind,
    url: parsed.url.toString(),
    platform: platformFor(parsed.url),
    inputType: "url",
    trustedSpeakingPractice,
    iframeAllow: iframePermissionsFor(parsed.url),
    message: kind === "embed"
      ? "將在 Lesson Hub 頁內嵌入；仍保留新分頁備援。"
      : "此公開連結會在新分頁開啟，不會顯示失敗的 iframe。"
  };
}
