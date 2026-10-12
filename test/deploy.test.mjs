import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { formatJson } from "../lib/content.mjs";
import { capture, deploy, inspect, summarize } from "../lib/sync.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "dotfiles-"));
function put(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
const get = (root, path) => readFileSync(join(root, path), "utf8");
function fixture() {
  const repo = tmp();
  const home = tmp();
  put(repo, "claude/CLAUDE.md", "# me\n");
  put(repo, "claude/settings.json", formatJson({ model: "opus", effortLevel: "xhigh" }));
  put(repo, "git/ignore", ".idea/\n");
  return { repo, home };
}
const statuses = (results) => Object.fromEntries(results.map((r) => [r.target.home, r.status]));
const allInSync = (repo, home) => inspect(repo, home).every((r) => r.status === "in-sync");

test("deploy writes everything into an empty home, then all is in sync", () => {
  const { repo, home } = fixture();
  const results = deploy(repo, home);
  assert.ok(results.every((r) => r.action === "written"));
  assert.equal(get(home, ".claude/CLAUDE.md"), "# me\n");
  assert.ok(existsSync(join(home, ".config/dotfiles/state.json")));
  assert.ok(allInSync(repo, home));
});

test("deploy --force merges shared settings into an existing file and keeps machine keys", () => {
  const { repo, home } = fixture();
  put(home, ".claude/settings.json", formatJson({ tui: "fullscreen", model: "sonnet" }));
  assert.equal(statuses(deploy(repo, home))[".claude/settings.json"], "conflict");
  deploy(repo, home, { force: true });
  assert.equal(get(home, ".claude/settings.json"), formatJson({ tui: "fullscreen", model: "opus", effortLevel: "xhigh" }));
  assert.ok(allInSync(repo, home));
});

test("deploy leaves a machine edit in place and fails", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(home, ".claude/CLAUDE.md", "# me, edited\n");
  const results = deploy(repo, home);
  assert.equal(statuses(results)[".claude/CLAUDE.md"], "machine-edit");
  assert.equal(get(home, ".claude/CLAUDE.md"), "# me, edited\n");
  assert.equal(summarize(results).exitCode, 1);
});

test("deploy applies a repo update", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(repo, "claude/CLAUDE.md", "# me, v2\n");
  assert.equal(statuses(deploy(repo, home))[".claude/CLAUDE.md"], "repo-ahead");
  assert.equal(get(home, ".claude/CLAUDE.md"), "# me, v2\n");
});

test("deploy --force overwrites a conflict", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(repo, "claude/CLAUDE.md", "# repo\n");
  put(home, ".claude/CLAUDE.md", "# machine\n");
  assert.equal(statuses(deploy(repo, home))[".claude/CLAUDE.md"], "conflict");
  deploy(repo, home, { force: true });
  assert.equal(get(home, ".claude/CLAUDE.md"), "# repo\n");
});

test("capture copies a machine edit back and records it", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(home, ".claude/CLAUDE.md", "# me, edited\r\n");
  const results = capture(repo, home);
  assert.equal(results.find((r) => r.target.home === ".claude/CLAUDE.md").action, "captured");
  assert.equal(get(repo, "claude/CLAUDE.md"), "# me, edited\n");
  assert.ok(allInSync(repo, home));
});

test("capture writes only the shared settings keys and drops removed ones", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(home, ".claude/settings.json", formatJson({ tui: "fullscreen", model: "sonnet" }));
  capture(repo, home);
  assert.equal(get(repo, "claude/settings.json"), formatJson({ model: "sonnet" }));
  assert.ok(allInSync(repo, home));
});

test("capture never touches files the repo does not track", () => {
  const { repo, home } = fixture();
  deploy(repo, home);
  put(home, ".claude/skills/synced/x/SKILL.md", "account-synced\n");
  put(home, ".claude/agents/local.md", "local\n");
  capture(repo, home);
  assert.equal(existsSync(join(repo, "claude/skills")), false);
  assert.equal(existsSync(join(repo, "claude/agents")), false);
});

test("an invalid settings.json is left untouched by deploy and capture", () => {
  const { repo, home } = fixture();
  put(home, ".claude/settings.json", "{ broken");
  const results = deploy(repo, home, { force: true });
  assert.equal(statuses(results)[".claude/settings.json"], "error");
  assert.equal(get(home, ".claude/settings.json"), "{ broken");
  assert.equal(get(home, ".claude/CLAUDE.md"), "# me\n");
  capture(repo, home);
  assert.equal(get(repo, "claude/settings.json"), formatJson({ model: "opus", effortLevel: "xhigh" }));
  assert.equal(summarize(results).exitCode, 1);
});

test("the CLI rejects an unknown command with usage and exit code 2", () => {
  const cli = fileURLToPath(new URL("../sync.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [cli, "nope"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage: node sync\.mjs/);
});
