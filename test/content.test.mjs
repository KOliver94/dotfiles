import assert from "node:assert/strict";
import { test } from "node:test";
import { formatJson, hash, normalize } from "../lib/content.mjs";

test("strips a BOM and CRLF line endings", () => {
  assert.equal(normalize("﻿a\r\nb\r\n"), "a\nb\n");
});

test("hashes CRLF and LF variants of the same text equally", () => {
  assert.equal(hash("a\r\nb\r\n"), hash("a\nb\n"));
  assert.notEqual(hash("a\nb\n"), hash("a\nc\n"));
});

test("formats JSON with 2 spaces and a trailing newline", () => {
  assert.equal(formatJson({ a: { b: 1 } }), '{\n  "a": {\n    "b": 1\n  }\n}\n');
});
