import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { formatJson, hash, normalize } from "./content.mjs";
import { decide } from "./decide.mjs";
import { machineOnlyKeys, mergeShared, projectShared } from "./settings.mjs";
import { readState, writeState } from "./state.mjs";
import { listTargets } from "./targets.mjs";

const readText = (path) => (existsSync(path) ? normalize(readFileSync(path, "utf8")) : null);

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, normalize(text));
}

const deployedText = (v) => (v.shared ? formatJson(mergeShared(v.local ?? {}, v.shared)) : v.repoText);

// Unknown counts as changed: capture must never overwrite work that git cannot give back.
function repoFileChanged(repo, path) {
  try {
    const out = execFileSync("git", ["-C", repo, "status", "--porcelain", "--", path], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() !== "";
  } catch {
    return true;
  }
}

// What sync compares for one target: the whole file, or for settings.json only the shared keys.
function view(target, repo, home) {
  const homePath = join(home, target.home);
  const repoText = readText(join(repo, target.repo));
  const homeText = readText(homePath);
  if (target.kind !== "settings") {
    return { homePath, repoText, homeText, repoView: repoText, homeView: homeText };
  }
  const shared = JSON.parse(repoText);
  const local = homeText === null ? null : JSON.parse(homeText);
  const homeView = local === null ? null : formatJson(projectShared(local, shared));
  return { homePath, repoText, homeText, shared, local, repoView: formatJson(shared), homeView };
}

export function inspect(repo, home, state = readState(home)) {
  return listTargets(repo).map((target) => {
    try {
      const v = view(target, repo, home);
      const status = decide({
        repo: hash(v.repoView),
        target: v.homeView === null ? null : hash(v.homeView),
        base: state[target.home] ?? null,
      });
      return { target, status, view: v };
    } catch (error) {
      return { target, status: "error", error: error.message };
    }
  });
}

export function summarize(results) {
  const lines = results.map(({ target, status, action, error, view: v }) => {
    let line = `${status.padEnd(14)}~/${target.home}`;
    if (error) line += `: ${error}`;
    if (action) line += ` (${action})`;
    if (v?.local) {
      const extra = machineOnlyKeys(v.local, v.shared);
      if (extra.length) line += ` (machine-only: ${extra.join(", ")})`;
    }
    return line;
  });
  const exitCode = results.some((r) => r.status !== "in-sync" && !r.action) ? 1 : 0;
  return { lines, exitCode };
}

// `claude plugin install` writes ~/.claude/settings.json, so it must not run while that file is unreadable.
export function pluginBlocker(results) {
  const settings = results.find((r) => r.target.kind === "settings");
  return settings?.status === "error" ? "~/.claude/settings.json is unreadable" : null;
}

export function deploy(repo, home, { force = false } = {}) {
  const state = readState(home);
  const results = inspect(repo, home, state).map((result) => {
    const { status, target, view: v } = result;
    if (status === "error") return result;
    if (status === "in-sync") {
      state[target.home] = hash(v.repoView);
      return result;
    }
    if (status === "missing" || status === "repo-ahead" || force) {
      writeText(v.homePath, deployedText(v));
      state[target.home] = hash(v.repoView);
      return { ...result, action: "written" };
    }
    return result;
  });
  writeState(home, state);
  return results;
}

export function capture(repo, home) {
  const state = readState(home);
  const results = inspect(repo, home, state).map((result) => {
    const { status, target, view: v } = result;
    if (status === "in-sync") state[target.home] = hash(v.repoView);
    if (status !== "machine-edit" && status !== "conflict") return result;
    if (status === "conflict" && repoFileChanged(repo, target.repo)) {
      return { ...result, error: "the repo copy has uncommitted changes; commit or discard them, then capture again" };
    }
    writeText(join(repo, target.repo), v.homeView);
    state[target.home] = hash(v.homeView);
    return { ...result, action: "captured" };
  });
  writeState(home, state);
  return results;
}
