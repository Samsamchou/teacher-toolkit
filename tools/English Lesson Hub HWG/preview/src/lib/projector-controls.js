export const PROJECTOR_DOCK_REVEAL_PX = 96;

export function projectorShortcutAction(key) {
  if (key === "ArrowLeft") return "previous";
  if (key === "ArrowRight") return "next";
  if (String(key || "").toLowerCase() === "f") return "fullscreen";
  return null;
}

export function shouldRevealProjectorDock(pointerY, viewportHeight, revealHeight = PROJECTOR_DOCK_REVEAL_PX) {
  if (!Number.isFinite(pointerY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
  return pointerY >= Math.max(0, viewportHeight - revealHeight);
}
