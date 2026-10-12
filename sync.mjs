import { homedir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { capture, deploy, inspect, summarize } from "./lib/sync.mjs";

const usage = "usage: node sync.mjs <deploy|capture|check> [--force] [--no-plugins] [--home <dir>]";

function fail() {
  console.error(usage);
  process.exit(2);
}

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: { force: { type: "boolean" }, "no-plugins": { type: "boolean" }, home: { type: "string" } },
  });
} catch {
  fail();
}
const { positionals, values } = parsed;
const [command] = positionals;
if (positionals.length !== 1 || !["deploy", "capture", "check"].includes(command)) fail();

const repo = dirname(fileURLToPath(import.meta.url));
const home = values.home ?? homedir();
const results =
  command === "deploy" ? deploy(repo, home, { force: values.force }) : command === "capture" ? capture(repo, home) : inspect(repo, home);
const { lines, exitCode } = summarize(results);
for (const line of lines) console.log(line);
process.exitCode = exitCode;
