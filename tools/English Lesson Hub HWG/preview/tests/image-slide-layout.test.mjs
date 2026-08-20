import test from "node:test";
import assert from "node:assert/strict";

import { fitImageInsideFrame } from "../src/lib/image-slide-layout.js";

test("portrait image keeps its bottom edge inside a reduced projector frame", () => {
  const fitted = fitImageInsideFrame({
    naturalWidth: 1080,
    naturalHeight: 1920,
    frameWidth: 1300,
    frameHeight: 620
  });
  assert.deepEqual({ width: fitted.width, height: fitted.height }, { width: 348, height: 620 });
  assert.ok(fitted.scale < 1);
});

test("landscape and panoramic images fit without cropping", () => {
  assert.deepEqual(
    fitImageInsideFrame({
      naturalWidth: 1920,
      naturalHeight: 1080,
      frameWidth: 1200,
      frameHeight: 700
    }),
    { width: 1200, height: 675, scale: 0.625 }
  );
  assert.deepEqual(
    fitImageInsideFrame({
      naturalWidth: 3000,
      naturalHeight: 600,
      frameWidth: 1200,
      frameHeight: 700
    }),
    { width: 1200, height: 240, scale: 0.4 }
  );
});

test("small images stay at native size instead of being enlarged", () => {
  assert.deepEqual(
    fitImageInsideFrame({
      naturalWidth: 320,
      naturalHeight: 240,
      frameWidth: 1920,
      frameHeight: 980
    }),
    { width: 320, height: 240, scale: 1 }
  );
});

test("fullscreen recomputes a complete portrait image and invalid dimensions fail closed", () => {
  const fitted = fitImageInsideFrame({
    naturalWidth: 1080,
    naturalHeight: 1920,
    frameWidth: 1880,
    frameHeight: 970
  });
  assert.deepEqual({ width: fitted.width, height: fitted.height }, { width: 545, height: 970 });
  assert.equal(fitImageInsideFrame({ naturalWidth: 0, naturalHeight: 0, frameWidth: 1880, frameHeight: 970 }), null);
});
