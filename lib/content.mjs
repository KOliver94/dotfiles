import { createHash } from "node:crypto";

// Editors and git's autocrlf add BOMs and CRLF; neither is a real edit.
export function normalize(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

export function hash(text) {
  return createHash("sha256").update(normalize(text)).digest("hex");
}

export function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
