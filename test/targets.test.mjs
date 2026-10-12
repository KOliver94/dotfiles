import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { readState, writeState } from "../lib/state.mjs";
import { listTargets } from "../lib/targets.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "dotfiles-"));
function put(root, path, text = "x\n") {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

test("lists only the mapped files the repo has", () => {
  const repo = tmp();
  put(repo, "claude/CLAUDE.md");
  put(repo, "claude/settings.json", "{}\n");
  put(repo, "git/ignore");
  put(repo, "README.md");
  assert.deepEqual(listTargets(repo), [
    { repo: "claude/CLAUDE.md", home: ".claude/CLAUDE.md", kind: "file" },
    { repo: "claude/settings.json", home: ".claude/settings.json", kind: "settings" },
    { repo: "git/ignore", home: ".config/git/ignore", kind: "file" },
  ]);
});

test("expands synced directories into their files, in a stable order", () => {
  const repo = tmp();
  put(repo, "claude/skills/commit/ref/notes.md");
  put(repo, "claude/skills/commit/SKILL.md");
  assert.deepEqual(
    listTargets(repo).map((t) => t.home),
    [".claude/skills/commit/SKILL.md", ".claude/skills/commit/ref/notes.md"],
  );
});

test("state round-trips", () => {
  const home = tmp();
  writeState(home, { ".claude/CLAUDE.md": "abc" });
  assert.deepEqual(readState(home), { ".claude/CLAUDE.md": "abc" });
});

test("a missing or corrupt state reads as empty", () => {
  const home = tmp();
  assert.deepEqual(readState(home), {});
  put(home, ".config/dotfiles/state.json", "{not json");
  assert.deepEqual(readState(home), {});
  put(home, ".config/dotfiles/state.json", "[1]\n");
  assert.deepEqual(readState(home), {});
});
