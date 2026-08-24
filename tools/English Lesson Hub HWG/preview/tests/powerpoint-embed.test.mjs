import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSeedLessons, stepTypes, TARGET_POWERPOINT_LESSON_ID } from "../src/data/lesson-data.js";
import { migrateLessonState } from "../src/lib/lesson-migrations.js";
import { desktopPowerPointUrl, parsePowerPointEmbedInput } from "../src/lib/powerpoint-embed.js";

const root = resolve(import.meta.dirname, "..");

test("accepts only safe Microsoft PowerPoint HTTPS URLs or one iframe", () => {
  const short = parsePowerPointEmbedInput("https://1drv.ms/p/c/example-token");
  assert.equal(short.kind, "valid");
  assert.equal(short.needsPreviewCheck, true);

  const oneDriveIframe = parsePowerPointEmbedInput('<iframe src="https://1drv.ms/p/c/example-token?em=2&amp;wdAr=1.7777777777777777" width="1600px" height="900px" frameborder="0" title="PowerPoint Viewer">Microsoft Office presentation.</iframe>');
  assert.equal(oneDriveIframe.kind, "valid");
  assert.equal(oneDriveIframe.inputType, "iframe");
  assert.equal(oneDriveIframe.url, "https://1drv.ms/p/c/example-token?em=2&wdAr=1.7777777777777777");
  assert.equal(oneDriveIframe.needsPreviewCheck, false);

  const iframe = parsePowerPointEmbedInput('<iframe src="https://onedrive.live.com/embed?resid=ABC&amp;em=2" width="402" height="327"></iframe>');
  assert.equal(iframe.kind, "valid");
  assert.equal(iframe.inputType, "iframe");
  assert.equal(iframe.url, "https://onedrive.live.com/embed?resid=ABC&em=2");
  assert.equal(iframe.needsPreviewCheck, false);
  assert.equal(desktopPowerPointUrl(iframe.url), "ms-powerpoint:ofe|u|https://onedrive.live.com/embed?resid=ABC&em=2");

  for (const unsafe of [
    "http://onedrive.live.com/embed?resid=ABC",
    "https://example.com/embed/presentation",
    '<iframe src="https://onedrive.live.com/embed?resid=ABC" onload="alert(1)"></iframe>',
    '<iframe src="https://onedrive.live.com/embed?resid=ABC"></iframe><iframe src="https://onedrive.live.com/embed?resid=DEF"></iframe>',
    "<script>alert(1)</script>"
  ]) {
    assert.equal(parsePowerPointEmbedInput(unsafe).kind, "invalid", unsafe);
  }
});

test("only HWG5 Starter Lesson 1 replaces Step 1 with PowerPoint animation", () => {
  const lessons = createSeedLessons();
  assert.equal(lessons.length, 46);
  const target = lessons.find((lesson) => lesson.id === TARGET_POWERPOINT_LESSON_ID);
  assert.equal(target.steps[0].type, "powerpoint");
  assert.equal(target.steps[0].title, "PowerPoint（動畫）");
  assert.equal(target.steps[0].content.embedUrl, "");
  assert.equal(lessons.filter((lesson) => lesson.id !== TARGET_POWERPOINT_LESSON_ID).every((lesson) => lesson.steps[0].type === "warmup"), true);
  assert.ok(stepTypes.some((type) => type.value === "powerpoint" && type.label === "PowerPoint（動畫）"));
});

test("migration changes only the target Step 1 and preserves a saved 14-step lesson", () => {
  const seeds = createSeedLessons();
  const targetSeed = seeds.find((lesson) => lesson.id === TARGET_POWERPOINT_LESSON_ID);
  const fourteenSteps = [
    { id: "saved-warmup", type: "warmup", title: "Saved Step 1", enabled: true, content: { body: "teacher edit" } },
    { id: "saved-presentation", type: "presentation", title: "Saved PDF", enabled: true, content: { uploadedMedia: null } },
    ...Array.from({ length: 12 }, (_, index) => ({ id: "saved-" + (index + 3), type: "warmup", title: "Saved Step " + (index + 3), enabled: true, content: { body: String(index + 3) } }))
  ];
  const migrated = migrateLessonState([{ ...targetSeed, title: "Teacher 14 steps", steps: fourteenSteps }], [targetSeed]);
  assert.equal(migrated[0].steps.length, 14);
  assert.equal(migrated[0].steps[0].type, "powerpoint");
  assert.equal(migrated[0].steps[1].id, "saved-presentation");
  assert.equal(migrated[0].title, "Teacher 14 steps");

  const otherSeed = seeds.find((lesson) => lesson.id === "hwg5-starter-l02");
  const other = migrateLessonState([{ ...otherSeed, steps: fourteenSteps }], [otherSeed]);
  assert.equal(other[0].steps[0].type, "warmup");
});

test("Studio and Lesson Flow wire PowerPoint controls without committing the teacher share token", async () => {
  const files = await Promise.all([
    readFile(resolve(root, "src/main.jsx"), "utf8"),
    readFile(resolve(root, "src/data/lesson-data.js"), "utf8"),
    readFile(resolve(root, "src/lib/powerpoint-embed.js"), "utf8"),
    readFile(resolve(root, "src/components/powerpoint-embed-fields.jsx"), "utf8"),
    readFile(resolve(root, "src/components/powerpoint-step.jsx"), "utf8"),
    readFile(resolve(root, "src/media-presentation.css"), "utf8")
  ]);
  const combined = files.join("\n");
  for (const marker of ["PowerPointEmbedFields", "PowerPointStep", "全螢幕", "縮小", "新分頁", "桌面 PowerPoint", "allowFullScreen", "ms-powerpoint:ofe|u|"]) {
    assert.ok(combined.includes(marker), "missing " + marker);
  }
  assert.match(combined, /\.powerpoint-step:fullscreen/);
  assert.equal(/https:\/\/1drv\.ms\/p\/c\/411bb/i.test(combined), false);
});
