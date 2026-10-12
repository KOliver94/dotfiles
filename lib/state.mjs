import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { formatJson } from "./content.mjs";

const statePath = (home) => join(home, ".config", "dotfiles", "state.json");

// A missing or unreadable state only loses the baseline: differing targets then report conflicts instead of being overwritten.
export function readState(home) {
  try {
    const state = JSON.parse(readFileSync(statePath(home), "utf8"));
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  } catch {
    return {};
  }
}

export function writeState(home, state) {
  mkdirSync(dirname(statePath(home)), { recursive: true });
  writeFileSync(statePath(home), formatJson(state));
}
