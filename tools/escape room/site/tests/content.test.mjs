import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ASSETS, FLOW_NODES, IMAGE_QUESTIONS, MISSIONS, QUESTIONS } from "../public/data.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(here, "../public");

assert.equal(MISSIONS.length, 6, "exactly six Missions");
assert.equal(QUESTIONS.length, 18, "exactly 18 main questions");
assert.equal(Object.keys(IMAGE_QUESTIONS).length, 3, "exactly three image subquestions");
assert.equal(FLOW_NODES.length, 21, "18 main + 3 required image nodes");

for (const mission of MISSIONS) {
  assert.equal(QUESTIONS.filter((question) => question.mission === mission.id).length, 3, `Mission ${mission.id} has three main questions`);
  assert.ok(existsSync(resolve(publicRoot, mission.scene)), `${mission.scene} exists`);
  assert.ok(existsSync(resolve(publicRoot, mission.rewardImage)), `${mission.rewardImage} exists`);
}

const answerDistribution = [0, 1, 2].map((index) => QUESTIONS.filter((question) => question.answer === index).length);
assert.deepEqual(answerDistribution, [6, 6, 6], "A/B/C answers are balanced 6/6/6");
assert.deepEqual(FLOW_NODES.map((node) => node.id).filter((id) => id.endsWith("-A")), ["U01-M1-Q1-A", "U02-M4-Q1-A", "U02-M6-Q3-A"]);

for (const node of FLOW_NODES) {
  assert.ok(node.contextEn?.trim(), `${node.id} has an English context`);
  assert.ok(node.contextZh?.trim(), `${node.id} has a Chinese context`);
  assert.ok(node.missionGoalZh?.startsWith("任務目標："), `${node.id} has a Chinese mission goal`);
  assert.ok(/[\u3400-\u9fff]/u.test(node.contextZh), `${node.id} Chinese context contains Chinese text`);
  assert.ok(node.contextZh.split(/\r?\n/).length <= 2, `${node.id} Chinese context is at most two lines`);
  assert.ok(node.missionGoalZh.split(/\r?\n/).length <= 2, `${node.id} Chinese mission goal is at most two lines`);
  assert.doesNotMatch(
    `${node.contextZh} ${node.missionGoalZh}`,
    /(?:U0[12]-M\d-Q\d|節點\s*\d+\s*\/\s*21)/u,
    `${node.id} student guidance hides internal numbering`,
  );
  assert.ok(node.prompt, `${node.id} has a prompt`);
  assert.ok(node.explanation, `${node.id} has post-answer teaching`);
  assert.ok(node.stateChange, `${node.id} changes story state`);
  if (node.type === "choice") {
    assert.equal(node.options.length, 3, `${node.id} has three options`);
    assert.ok(existsSync(resolve(publicRoot, node.evidence)), `${node.id} evidence asset exists`);
  } else {
    assert.equal(node.optionImages.length, 3, `${node.id} has three image options`);
    node.optionImages.forEach((asset) => assert.ok(existsSync(resolve(publicRoot, asset)), `${asset} exists`));
  }
}

for (const [name, asset] of Object.entries(ASSETS)) {
  assert.ok(existsSync(resolve(publicRoot, asset)), `${name} asset exists`);
}

console.log("content-contract=PASS");
console.log(`missions=${MISSIONS.length}|main=${QUESTIONS.length}|nodes=${FLOW_NODES.length}|answers=${answerDistribution.join("/")}`);
