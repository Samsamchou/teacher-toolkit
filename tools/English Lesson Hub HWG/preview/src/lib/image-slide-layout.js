function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function fitImageInsideFrame({
  naturalWidth,
  naturalHeight,
  frameWidth,
  frameHeight
}) {
  const sourceWidth = positiveNumber(naturalWidth);
  const sourceHeight = positiveNumber(naturalHeight);
  const availableWidth = positiveNumber(frameWidth);
  const availableHeight = positiveNumber(frameHeight);
  if (!sourceWidth || !sourceHeight || !availableWidth || !availableHeight) return null;

  const scale = Math.min(1, availableWidth / sourceWidth, availableHeight / sourceHeight);
  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale)),
    scale
  };
}
