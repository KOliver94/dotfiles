import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../lib/decide.mjs";

test("a missing target is written", () => {
  assert.equal(decide({ repo: "r", target: null, base: "r" }), "missing");
  assert.equal(decide({ repo: "r", target: null, base: null }), "missing");
});

test("equal repo and target are in sync, with or without a baseline", () => {
  assert.equal(decide({ repo: "x", target: "x", base: null }), "in-sync");
  assert.equal(decide({ repo: "x", target: "x", base: "old" }), "in-sync");
});

test("an untouched target behind the repo is a repo update", () => {
  assert.equal(decide({ repo: "new", target: "old", base: "old" }), "repo-ahead");
});

test("a target changed since the last sync is a machine edit", () => {
  assert.equal(decide({ repo: "old", target: "edited", base: "old" }), "machine-edit");
});

test("both sides changed is a conflict", () => {
  assert.equal(decide({ repo: "new", target: "edited", base: "old" }), "conflict");
});

test("without a baseline a differing target is a conflict, never overwritten", () => {
  assert.equal(decide({ repo: "r", target: "t", base: null }), "conflict");
});
