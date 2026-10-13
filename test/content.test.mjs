import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { formatJson, hash, normalize } from "../lib/content.mjs";

test("strips a BOM and CRLF line endings", () => {
  assert.equal(normalize("\uFEFFa\r\nb\r\n"), "a\nb\n");
});

test("hashes CRLF and LF variants of the same text equally", () => {
  assert.equal(hash("a\r\nb\r\n"), hash("a\nb\n"));
  assert.notEqual(hash("a\nb\n"), hash("a\nc\n"));
});

test("formats JSON with 2 spaces and a trailing newline", () => {
  assert.equal(formatJson({ a: { b: 1 } }), '{\n  "a": {\n    "b": 1\n  }\n}\n');
});

// A literal U+FEFF is invisible and editors strip it; the regex would then match nothing and its tests would lose their BOM with it.
test("source files write the BOM as an escape, never as the character itself", () => {
  const bom = String.fromCharCode(0xfeff);
  const offenders = ["lib", "test"].flatMap((dir) => {
    const url = new URL(`../${dir}/`, import.meta.url);
    return readdirSync(url)
      .filter((name) => name.endsWith(".mjs") && readFileSync(new URL(name, url), "utf8").includes(bom))
      .map((name) => `${dir}/${name}`);
  });
  assert.deepEqual(offenders, []);
});
