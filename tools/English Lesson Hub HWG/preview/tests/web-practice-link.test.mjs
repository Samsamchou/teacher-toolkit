import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import source from "../config/site-source.json" with { type: "json" };
import { parseWebPracticeInput } from "../src/lib/web-practice-link.js";

const root = resolve(import.meta.dirname, "..");
const [mainSource, styleSource] = await Promise.all([
  readFile(resolve(root, "src/main.jsx"), "utf8"),
  readFile(resolve(root, "src/styles.css"), "utf8")
]);

test("Canva public share links open externally instead of entering a refused iframe", () => {
  const shortLink = parseWebPracticeInput("https://canva.link/6dmyzbaseejgv3s");
  assert.equal(shortLink.kind, "external");
  assert.equal(shortLink.platform, "Canva");

  const watchLink = parseWebPracticeInput("https://www.canva.com/design/DAGxoRZ-uZE/example/watch");
  assert.equal(watchLink.kind, "external");
});

test("Canva Embed URLs and full iframe code resolve to one safe HTTPS src", () => {
  const embedUrl = "https://www.canva.com/design/DAGxoRZ-uZE/example/view?embed";
  const direct = parseWebPracticeInput(embedUrl);
  assert.equal(direct.kind, "embed");
  assert.equal(direct.url, embedUrl);

  const code = `<div style="position:relative"><iframe loading="lazy" src="${embedUrl}&amp;utm_source=lesson" allowfullscreen></iframe></div><a href="https://www.canva.com/">Canva</a>`;
  const parsed = parseWebPracticeInput(code);
  assert.equal(parsed.kind, "embed");
  assert.equal(parsed.inputType, "iframe");
  assert.equal(parsed.url, embedUrl + "&utm_source=lesson");
});

test("existing Wayground and explicit embed URLs remain inline", () => {
  const configured = source.contentProfiles["hwg7-u01-l01-live"].webPractice.url;
  for (const parsed of [
    parseWebPracticeInput(configured),
    parseWebPracticeInput("https://example.org/tools/embed/activity-1"),
    parseWebPracticeInput("https://embed.example.org/activity-1")
  ]) {
    assert.equal(parsed.kind, "embed");
    assert.equal(parsed.trustedSpeakingPractice, false);
    assert.equal(parsed.iframeAllow, "fullscreen");
  }
});

test("the exact speaking-practice origin embeds with microphone delegation", () => {
  const direct = parseWebPracticeInput("https://setencerevieworalpractice.web.app/");
  assert.equal(direct.kind, "embed");
  assert.equal(direct.platform, "Sentence Review Oral Practice");
  assert.equal(direct.trustedSpeakingPractice, true);
  assert.equal(direct.iframeAllow, "microphone *; fullscreen *");

  const iframe = parseWebPracticeInput('<iframe src="https://setencerevieworalpractice.web.app/?unit=hwg5-sr"></iframe>');
  assert.equal(iframe.kind, "embed");
  assert.equal(iframe.trustedSpeakingPractice, true);
  assert.equal(iframe.iframeAllow, "microphone *; fullscreen *");
});

test("other Firebase Hosting origins do not receive inline microphone access", () => {
  for (const url of [
    "https://someone-else.web.app/",
    "https://someone-else.firebaseapp.com/",
    "https://setencerevieworalpractice.web.app.example.org/"
  ]) {
    const parsed = parseWebPracticeInput(url);
    assert.equal(parsed.kind, "external", url);
    assert.equal(parsed.trustedSpeakingPractice, false, url);
    assert.equal(parsed.iframeAllow, "fullscreen", url);
  }
});

test("unknown HTTPS URLs safely fall back to a new tab", () => {
  const parsed = parseWebPracticeInput("https://example.org/public/activity");
  assert.equal(parsed.kind, "external");
  assert.equal(parsed.url, "https://example.org/public/activity");
});

test("unsafe or malformed input is rejected without returning a launch URL", () => {
  for (const input of [
    "http://example.org/activity",
    "javascript:alert(1)",
    "https://teacher:secret@example.org/activity",
    "<iframe></iframe>",
    "<iframe src=\"https://example.org/embed\" onload=\"alert(1)\"></iframe>",
    "<script>alert(1)</script><iframe src=\"https://example.org/embed\"></iframe>",
    "<iframe src=\"https://example.org/one\"></iframe><iframe src=\"https://example.org/two\"></iframe>"
  ]) {
    const parsed = parseWebPracticeInput(input);
    assert.equal(parsed.kind, "invalid", input);
    assert.equal(parsed.url, "", input);
  }
});

test("Studio and Lesson Flow use classified URLs, status help, and an external launch card", () => {
  for (const marker of [
    "parseWebPracticeInput",
    "Practice URL / Embed code",
    "測試連結",
    "web-practice-link-status",
    "web-practice-launch-panel",
    "開啟互動網頁",
    "Lesson Hub 不會讀取帳密或 Cookie",
    "src={practiceLink.url}",
    "allow={practiceLink.iframeAllow}"
  ]) assert.ok(mainSource.includes(marker), "missing " + marker);
  assert.equal(mainSource.includes("src={step.content.url}"), false);
  assert.equal(mainSource.includes('allow="microphone *; fullscreen *"'), false);
  assert.match(styleSource, /\.web-practice-launch-panel \{/);
  assert.match(styleSource, /\.projector-cockpit \.web-practice-launch-panel \{/);
  assert.match(styleSource, /\.lesson-stage:fullscreen \.web-practice-launch-panel \{/);
});
