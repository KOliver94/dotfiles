import assert from "node:assert/strict";
import { test } from "node:test";
import { planPlugins, syncPlugins } from "../lib/plugins.mjs";

const shared = {
  extraKnownMarketplaces: { caveman: { source: { source: "github", repo: "JuliusBrussee/caveman" } } },
  enabledPlugins: { "caveman@caveman": true, "github@claude-plugins-official": true, "old@elsewhere": false },
};

function fake({ marketplaces = [], plugins = [], fail = [] } = {}) {
  const calls = [];
  const run = (args) => {
    const command = args.join(" ");
    calls.push(command);
    if (command === "plugin marketplace list --json") return JSON.stringify(marketplaces);
    if (command === "plugin list --json") return JSON.stringify(plugins);
    if (fail.includes(command)) throw new Error("boom\nsecond line");
    return "";
  };
  return { calls, run };
}

test("plans only what is missing and skips disabled plugins", () => {
  assert.deepEqual(
    planPlugins(shared, [{ name: "claude-plugins-official" }], [{ id: "github@claude-plugins-official" }]),
    { marketplaces: ["JuliusBrussee/caveman"], plugins: ["caveman@caveman"] },
  );
});

test("nothing to plan when everything is present", () => {
  assert.deepEqual(
    planPlugins(shared, [{ name: "caveman" }], [{ id: "caveman@caveman" }, { id: "github@claude-plugins-official" }]),
    { marketplaces: [], plugins: [] },
  );
});

test("adds missing marketplaces before installing plugins", () => {
  const { calls, run } = fake({ plugins: [{ id: "github@claude-plugins-official" }] });
  const result = syncPlugins(shared, run);
  assert.deepEqual(calls.slice(2), [
    "plugin marketplace add JuliusBrussee/caveman",
    "plugin install caveman@caveman --scope user",
  ]);
  assert.equal(result.failed, false);
});

test("a failure is reported on one line and the rest continues", () => {
  const { calls, run } = fake({ fail: ["plugin marketplace add JuliusBrussee/caveman"] });
  const result = syncPlugins(shared, run);
  assert.equal(result.failed, true);
  assert.ok(result.lines.some((l) => l.startsWith("failed") && l.includes("boom") && !l.includes("second line")));
  assert.ok(calls.includes("plugin install caveman@caveman --scope user"));
});

test("a failed install reports the CLI's own error, not execFileSync's", () => {
  const { run } = fake({ marketplaces: [{ name: "caveman" }], plugins: [{ id: "github@claude-plugins-official" }] });
  const failing = (args) => {
    if (args[1] === "install") {
      throw Object.assign(new Error("Command failed: claude plugin install caveman@caveman --scope user"), {
        stderr: "\nPlugin caveman not found in marketplace caveman\n",
      });
    }
    return run(args);
  };
  const result = syncPlugins(shared, failing);
  assert.deepEqual(result.lines, [`${"failed".padEnd(14)}plugin caveman@caveman: Plugin caveman not found in marketplace caveman`]);
});

test("a failing list command is reported, not thrown", () => {
  const run = () => {
    throw Object.assign(new Error("Command failed: claude plugin list --json"), { stderr: "not logged in\n" });
  };
  assert.deepEqual(syncPlugins(shared, run), { lines: [`${"failed".padEnd(14)}plugins: not logged in`], failed: true });
});

test("unparsable list output is reported, not thrown", () => {
  const result = syncPlugins(shared, () => "not json");
  assert.equal(result.failed, true);
  assert.match(result.lines[0], /^failed\s+plugins: /);
});

test("a missing claude CLI skips the step", () => {
  const run = () => {
    throw Object.assign(new Error("spawnSync claude ENOENT"), { code: "ENOENT" });
  };
  assert.deepEqual(syncPlugins(shared, run), { lines: [`${"skipped".padEnd(14)}plugins: claude CLI not found`], failed: false });
});
