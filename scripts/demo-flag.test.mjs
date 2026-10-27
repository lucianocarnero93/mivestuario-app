import assert from "node:assert/strict";
import test from "node:test";
import { esBuildDemo } from "./demo-flag.mjs";

test("producción nunca es demo", () => {
  assert.equal(esBuildDemo({ VERCEL_ENV: "production", VITE_DEMO: "1", VERCEL_GIT_COMMIT_REF: "demo/app-v2" }), false);
  assert.equal(esBuildDemo({ VERCEL_ENV: "production" }), false);
});

test("un preview de demo/ sí es demo", () => {
  assert.equal(esBuildDemo({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "demo/app-v2" }), true);
  assert.equal(esBuildDemo({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "demo/x" }), true);
});

test("un preview de otra rama no es demo", () => {
  assert.equal(esBuildDemo({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(esBuildDemo({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "fix/algo" }), false);
});

test("en local manda VITE_DEMO", () => {
  assert.equal(esBuildDemo({ VITE_DEMO: "1" }), true);
  assert.equal(esBuildDemo({}), false);
  assert.equal(esBuildDemo({ VITE_DEMO: "0" }), false);
});
