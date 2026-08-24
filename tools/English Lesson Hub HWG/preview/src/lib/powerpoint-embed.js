const DANGEROUS_MARKUP = /<\s*(?:script|object|embed|form|base|meta|link)\b|\bsrcdoc\s*=|\son[a-z]+\s*=|javascript\s*:/i;
const IFRAME_TAG = /<iframe\b/gi;
const IFRAME_OPENING_TAG = /<iframe\b[^>]*>/i;
const IFRAME_SRC = /\bsrc\s*=\s*(["'])(.*?)\1/i;
const MICROSOFT_EMBED_DOMAINS = [
  "1drv.ms",
  "onedrive.live.com",
  "view.officeapps.live.com",
  "officeapps.live.com",
  "sharepoint.com"
];

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

function isMicrosoftEmbedHost(url) {
  return MICROSOFT_EMBED_DOMAINS.some((domain) => hostMatches(url.hostname, domain));
}

function isOfficialOneDriveShortEmbed(url) {
  if (!hostMatches(url.hostname, "1drv.ms") || !/^\/p\//i.test(url.pathname)) return false;
  const aspectRatio = Number(url.searchParams.get("wdAr"));
  const embedMode = url.searchParams.get("em");
  const autoAdvanceCheck = url.searchParams.get("wdEaaCheck");
  return Number.isFinite(aspectRatio)
    && aspectRatio > 0
    && (embedMode === "2" || /^(?:0|1)$/.test(autoAdvanceCheck || ""));
}

function isLikelyPresentationEmbed(url) {
  if (isOfficialOneDriveShortEmbed(url)) return true;
  if (hostMatches(url.hostname, "1drv.ms")) return false;
  if (hostMatches(url.hostname, "view.officeapps.live.com") || hostMatches(url.hostname, "officeapps.live.com")) return true;
  if (/\/(?:embed|embedview)(?:\/|$)/i.test(url.pathname)) return true;
  if (/^(?:embed|embedview)$/i.test(url.searchParams.get("action") || "")) return true;
  if (url.searchParams.get("em") === "2") return true;
  return false;
}

function invalid(message) {
  return { kind: "invalid", url: "", inputType: "invalid", needsPreviewCheck: false, message };
}

export function parsePowerPointEmbedInput(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return {
      kind: "empty",
      url: "",
      inputType: "empty",
      needsPreviewCheck: false,
      message: "請貼入 OneDrive 的 PowerPoint for the web Embed URL 或完整 iframe code。"
    };
  }

  let inputType = "url";
  let candidate = raw;
  if (raw.includes("<")) {
    if (DANGEROUS_MARKUP.test(raw)) return invalid("Embed code 含有不允許的程式或事件屬性。");
    const iframeMatches = raw.match(IFRAME_TAG) || [];
    if (iframeMatches.length !== 1 || !/<\/iframe\s*>/i.test(raw)) {
      return invalid("Embed code 必須包含且只能包含一個完整 iframe。");
    }
    const openingTag = raw.match(IFRAME_OPENING_TAG)?.[0] || "";
    const source = openingTag.match(IFRAME_SRC)?.[2];
    if (!source) return invalid("Embed code 找不到 iframe 的 src。");
    inputType = "iframe";
    candidate = decodeHtmlAttribute(source);
  }

  const parsed = readHttpsUrl(candidate);
  if (parsed.error) return invalid(parsed.error);
  if (!isMicrosoftEmbedHost(parsed.url)) {
    return invalid("只接受 OneDrive、PowerPoint for the web 或 Microsoft 365 官方 Embed 來源。");
  }
  const needsPreviewCheck = !isLikelyPresentationEmbed(parsed.url);
  return {
    kind: "valid",
    url: parsed.url.toString(),
    inputType,
    needsPreviewCheck,
    message: needsPreviewCheck
      ? "Microsoft 連結格式有效；請在預覽確認顯示的是投影片播放畫面，而不是編輯頁。"
      : "Microsoft Embed 格式有效，儲存時只會保留正規化 HTTPS URL。"
  };
}

export function desktopPowerPointUrl(input) {
  const parsed = parsePowerPointEmbedInput(input);
  return parsed.kind === "valid" ? "ms-powerpoint:ofe|u|" + parsed.url : "";
}
