import assert from "node:assert/strict";
import test from "node:test";
import {
  FIREBASE_RUNTIME_CONFIG_URL,
  hasFirebasePublicConfig,
  resolveFirebasePublicConfig
} from "../src/lib/firebase-public-config.js";

const complete = {
  apiKey: "public-test-value",
  authDomain: "project.firebaseapp.com",
  projectId: "hwg7teaching",
  appId: "1:test:web:test"
};

test("complete environment configuration wins without a network request", async () => {
  let fetched = false;
  const resolved = await resolveFirebasePublicConfig({
    environmentConfig: complete,
    expectedProjectId: "hwg7teaching",
    fetchImplementation: async () => { fetched = true; }
  });
  assert.equal(fetched, false);
  assert.equal(resolved.source, "environment");
  assert.equal(hasFirebasePublicConfig(resolved.config), true);
});

test("Firebase Hosting reserved runtime configuration enables the formal site", async () => {
  const resolved = await resolveFirebasePublicConfig({
    environmentConfig: {},
    expectedProjectId: "hwg7teaching",
    fetchImplementation: async (url) => ({ ok: true, json: async () => complete, url })
  });
  assert.equal(FIREBASE_RUNTIME_CONFIG_URL, "/__/firebase/init.json");
  assert.equal(resolved.source, "hosting-runtime");
  assert.equal(resolved.config.projectId, "hwg7teaching");
});

test("runtime configuration from another Firebase project fails closed", async () => {
  const resolved = await resolveFirebasePublicConfig({
    environmentConfig: {},
    expectedProjectId: "hwg7teaching",
    fetchImplementation: async () => ({ ok: true, json: async () => ({ ...complete, projectId: "unexpected-project" }) })
  });
  assert.equal(resolved.source, "project-mismatch");
  assert.equal(hasFirebasePublicConfig(resolved.config), false);
});
