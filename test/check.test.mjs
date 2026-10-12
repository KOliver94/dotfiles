import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { formatJson } from "../lib/content.mjs";
import { inspect, summarize } from "../lib/sync.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "dotfiles-"));
function put(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
function fixture() {
  const repo = tmp();
  const home = tmp();
  put(repo, "claude/CLAUDE.md", "# me\n");
  put(repo, "claude/settings.json", formatJson({ model: "opus" }));
  put(repo, "git/ignore", ".idea/\n");
  return { repo, home };
}
const statuses = (results) => Object.fromEntries(results.map((r) => [r.target.home, r.status]));

test("an empty home is all missing", () => {
  const { repo, home } = fixture();
  assert.deepEqual(statuses(inspect(repo, home)), {
    ".claude/CLAUDE.md": "missing",
    ".claude/settings.json": "missing",
    ".config/git/ignore": "missing",
  });
});

test("settings compare only the shared keys", () => {
  const { repo, home } = fixture();
  put(home, ".claude/settings.json", formatJson({ tui: "fullscreen", model: "opus" }));
  assert.equal(statuses(inspect(repo, home))[".claude/settings.json"], "in-sync");
});

test("CRLF and a BOM on the machine are not an edit", () => {
  const { repo, home } = fixture();
  put(home, ".claude/CLAUDE.md", "﻿# me\r\n");
  assert.equal(statuses(inspect(repo, home))[".claude/CLAUDE.md"], "in-sync");
});

test("an unreadable settings.json is an error, not a crash", () => {
  const { repo, home } = fixture();
  put(home, ".claude/settings.json", "{ broken");
  const results = inspect(repo, home);
  const settings = results.find((r) => r.target.kind === "settings");
  assert.equal(settings.status, "error");
  assert.match(settings.error, /JSON/);
  assert.equal(statuses(results)[".claude/CLAUDE.md"], "missing");
});

test("summarize lists statuses and machine-only keys and fails while anything is unsynced", () => {
  const { repo, home } = fixture();
  put(home, ".claude/settings.json", formatJson({ tui: "fullscreen", model: "opus" }));
  const { lines, exitCode } = summarize(inspect(repo, home));
  assert.ok(lines.includes(`${"in-sync".padEnd(14)}~/.claude/settings.json (machine-only: tui)`));
  assert.ok(lines.includes(`${"missing".padEnd(14)}~/.claude/CLAUDE.md`));
  assert.equal(exitCode, 1);
});

test("summarize passes when everything is in sync", () => {
  const { repo, home } = fixture();
  put(home, ".claude/CLAUDE.md", "# me\n");
  put(home, ".claude/settings.json", formatJson({ model: "opus" }));
  put(home, ".config/git/ignore", ".idea/\n");
  assert.equal(summarize(inspect(repo, home)).exitCode, 0);
});
