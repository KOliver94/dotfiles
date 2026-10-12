import { execFileSync } from "node:child_process";

// Deploy only adds: marketplaces as "owner/repo" sources and plugins as "name@marketplace" ids. Nothing is ever removed.
export function planPlugins(shared, configured, installed) {
  const known = new Set(configured.map((m) => m.name));
  const marketplaces = Object.entries(shared.extraKnownMarketplaces ?? {})
    .filter(([name]) => !known.has(name))
    .map(([, { source }]) => source.repo ?? source.url);
  const have = new Set(installed.map((p) => p.id));
  const plugins = Object.entries(shared.enabledPlugins ?? {})
    .filter(([id, enabled]) => enabled && !have.has(id))
    .map(([id]) => id);
  return { marketplaces, plugins };
}

const runClaude = (args) => execFileSync("claude", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

export function syncPlugins(shared, run = runClaude) {
  let configured;
  let installed;
  try {
    configured = JSON.parse(run(["plugin", "marketplace", "list", "--json"]));
    installed = JSON.parse(run(["plugin", "list", "--json"]));
  } catch (error) {
    if (error.code === "ENOENT") return { lines: [`${"skipped".padEnd(14)}plugins: claude CLI not found`], failed: false };
    throw error;
  }
  const { marketplaces, plugins } = planPlugins(shared, configured, installed);
  const lines = [];
  let failed = false;
  const attempt = (verb, label, args) => {
    try {
      run(args);
      lines.push(`${verb.padEnd(14)}${label}`);
    } catch (error) {
      failed = true;
      lines.push(`${"failed".padEnd(14)}${label}: ${String(error.message).split("\n")[0]}`);
    }
  };
  for (const source of marketplaces) attempt("added", `marketplace ${source}`, ["plugin", "marketplace", "add", source]);
  for (const id of plugins) attempt("installed", `plugin ${id}`, ["plugin", "install", id, "--scope", "user"]);
  return { lines, failed };
}
