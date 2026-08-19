import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fitMediaWithinFrame, formatMediaTime, getVideoAspectRatio, isVideoShortcutKey, seekMediaTime, VIDEO_SEEK_SECONDS } from "../src/lib/video-controls.js";

const root = resolve(import.meta.dirname, "..");
const [mainSource, playerSource] = await Promise.all([
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/components/teaching-video-player.jsx"), "utf8")
]);

test("external Teaching Video controls format time and keep seeking inside media bounds", () => {
  assert.equal(formatMediaTime(0), "0:00");
  assert.equal(formatMediaTime(64), "1:04");
  assert.equal(formatMediaTime(3661), "1:01:01");
  assert.equal(seekMediaTime(2, 64, -VIDEO_SEEK_SECONDS), 0);
  assert.equal(seekMediaTime(62, 64, VIDEO_SEEK_SECONDS), 64);
  assert.equal(seekMediaTime(20, 64, VIDEO_SEEK_SECONDS), 25);
});

test("Teaching Video preserves every source ratio inside the available frame", () => {
  assert.equal(getVideoAspectRatio(1920, 1080), 16 / 9);
  assert.equal(getVideoAspectRatio(0, 0), 16 / 9);
  assert.deepEqual(fitMediaWithinFrame(1920, 1080, 1200, 600), { width: 1066.6666666666667, height: 600 });
  assert.deepEqual(fitMediaWithinFrame(1080, 1920, 1200, 600), { width: 337.5, height: 600 });
  assert.deepEqual(fitMediaWithinFrame(2560, 1080, 1200, 600), { width: 1200, height: 506.25 });
  assert.deepEqual(fitMediaWithinFrame(1920, 1080, 0, 600), { width: 0, height: 0 });
});

test("external Teaching Video controls reserve keyboard shortcuts for the focused video", () => {
  assert.equal(isVideoShortcutKey(" "), true);
  assert.equal(isVideoShortcutKey("ArrowLeft"), true);
  assert.equal(isVideoShortcutKey("ArrowRight"), true);
  assert.equal(isVideoShortcutKey("f"), false);
  assert.ok(mainSource.includes("TeachingVideoPlayer"));
  assert.ok(playerSource.includes('data-video-player="external-controls"'));
  assert.equal(playerSource.includes("<video controls"), false);
  assert.ok(playerSource.includes("event.stopPropagation()"));
  assert.ok(playerSource.includes("requestFullscreen"));
  assert.ok(playerSource.includes("ResizeObserver"));
  assert.ok(playerSource.includes("fitMediaWithinFrame"));
});
