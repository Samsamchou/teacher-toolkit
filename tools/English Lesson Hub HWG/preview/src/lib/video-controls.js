export const VIDEO_SEEK_SECONDS = 5;
export const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9;

function positiveFinite(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getVideoAspectRatio(videoWidth, videoHeight) {
  const width = positiveFinite(videoWidth);
  const height = positiveFinite(videoHeight);
  return width && height ? width / height : DEFAULT_VIDEO_ASPECT_RATIO;
}

export function fitMediaWithinFrame(mediaWidth, mediaHeight, frameWidth, frameHeight) {
  const sourceWidth = positiveFinite(mediaWidth);
  const sourceHeight = positiveFinite(mediaHeight);
  const availableWidth = positiveFinite(frameWidth);
  const availableHeight = positiveFinite(frameHeight);
  if (!sourceWidth || !sourceHeight || !availableWidth || !availableHeight) return { width: 0, height: 0 };
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}

export function formatMediaTime(value) {
  const totalSeconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}:${seconds}`;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, "0")}:${seconds}`;
}

export function seekMediaTime(currentTime, duration, offset) {
  const current = Math.max(0, Number.isFinite(currentTime) ? currentTime : 0);
  const target = current + (Number.isFinite(offset) ? offset : 0);
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, target);
  return Math.min(duration, Math.max(0, target));
}

export function isVideoShortcutKey(key) {
  return key === " " || key === "Spacebar" || key === "ArrowLeft" || key === "ArrowRight";
}
