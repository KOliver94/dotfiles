import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// Repo path → path under the home directory. Only files the repo has are synced, so capture can never pick up anything the repo does not already track.
const FILES = [
  ["claude/CLAUDE.md", ".claude/CLAUDE.md"],
  ["claude/settings.json", ".claude/settings.json"],
  ["claude/statusline.ps1", ".claude/statusline.ps1"],
  ["claude/keybindings.json", ".claude/keybindings.json"],
  ["git/gitconfig", ".gitconfig"],
  ["git/ignore", ".config/git/ignore"],
  ["git/allowed_signers", ".config/git/allowed_signers"],
  ["mise/config.toml", ".config/mise/config.toml"],
];

const DIRS = [
  ["claude/skills", ".claude/skills"],
  ["claude/agents", ".claude/agents"],
  ["claude/rules", ".claude/rules"],
  ["claude/output-styles", ".claude/output-styles"],
];

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort(byName)
    .flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));
}

export function listTargets(repoRoot) {
  const targets = [];
  for (const [repo, home] of FILES) {
    if (existsSync(join(repoRoot, repo))) {
      targets.push({ repo, home, kind: repo === "claude/settings.json" ? "settings" : "file" });
    }
  }
  for (const [repoDir, homeDir] of DIRS) {
    const root = join(repoRoot, repoDir);
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const rel = relative(root, file).split("\\").join("/");
      targets.push({ repo: `${repoDir}/${rel}`, home: `${homeDir}/${rel}`, kind: "file" });
    }
  }
  return targets;
}
