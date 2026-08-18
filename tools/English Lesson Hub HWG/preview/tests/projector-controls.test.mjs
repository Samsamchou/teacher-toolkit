import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECTOR_DOCK_REVEAL_PX,
  projectorShortcutAction,
  shouldRevealProjectorDock
} from "../src/lib/projector-controls.js";

test("projector shortcuts keep lesson navigation and stage fullscreen predictable", () => {
  assert.equal(projectorShortcutAction("ArrowLeft"), "previous");
  assert.equal(projectorShortcutAction("ArrowRight"), "next");
  assert.equal(projectorShortcutAction("F"), "fullscreen");
  assert.equal(projectorShortcutAction("f"), "fullscreen");
  assert.equal(projectorShortcutAction("Enter"), null);
});

test("projector dock appears only in the bottom activation band", () => {
  assert.equal(shouldRevealProjectorDock(1079, 1080), true);
  assert.equal(shouldRevealProjectorDock(1080 - PROJECTOR_DOCK_REVEAL_PX, 1080), true);
  assert.equal(shouldRevealProjectorDock(980, 1080), false);
  assert.equal(shouldRevealProjectorDock(10, 0), false);
});
