import assert from "node:assert/strict";
import { test } from "node:test";
import { machineOnlyKeys, mergeShared, projectShared } from "../lib/settings.mjs";

const shared = { model: "opus", enabledPlugins: { "a@m": true } };

test("deploy replaces shared values in place and keeps machine keys and order", () => {
  const merged = mergeShared({ tui: "fullscreen", model: "sonnet", autoMode: { x: 1 } }, shared);
  assert.deepEqual(Object.keys(merged), ["tui", "model", "autoMode", "enabledPlugins"]);
  assert.equal(merged.model, "opus");
  assert.deepEqual(merged.autoMode, { x: 1 });
  assert.deepEqual(merged.enabledPlugins, { "a@m": true });
});

test("shared values are replaced whole, not deep-merged", () => {
  assert.deepEqual(mergeShared({ enabledPlugins: { "old@m": true } }, shared).enabledPlugins, { "a@m": true });
});

test("the projection follows the repo's key order and skips machine keys", () => {
  const local = { tui: "x", enabledPlugins: { "b@m": true }, model: "opus" };
  assert.deepEqual(Object.keys(projectShared(local, shared)), ["model", "enabledPlugins"]);
});

test("a shared key removed on the machine drops out of the projection", () => {
  assert.deepEqual(projectShared({ model: "opus" }, shared), { model: "opus" });
});

test("machine-only keys are listed", () => {
  assert.deepEqual(machineOnlyKeys({ tui: "x", model: "opus" }, shared), ["tui"]);
});

test("inputs are not mutated", () => {
  const local = { model: "sonnet" };
  mergeShared(local, shared);
  projectShared(local, shared);
  assert.deepEqual(local, { model: "sonnet" });
  assert.deepEqual(shared, { model: "opus", enabledPlugins: { "a@m": true } });
});
