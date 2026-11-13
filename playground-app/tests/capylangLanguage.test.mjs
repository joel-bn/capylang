import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  capylang,
  tokenizeCapylang,
} from "../src/lib/editor/capylangLanguage.js";

/**
 * @param {string} source
 * @param {string} name
 */
function textsOf(source, name) {
  return tokenizeCapylang(source)
    .filter((t) => t.name === name)
    .map((t) => t.text);
}

describe("capylangLanguage", () => {
  it("exports LanguageSupport via capylang()", () => {
    const support = capylang();
    assert.equal(support.language.name, "capylang");
  });

  it("highlights Capylang keywords from the lexer set", () => {
    const src = "fn foo() {\n  let mut x = 1;\n  return x;\n}";
    const keywords = textsOf(src, "keyword");
    assert.deepEqual(new Set(keywords), new Set(["fn", "let", "mut", "return"]));
  });

  it("highlights as (conversion) as keyword", () => {
    assert.ok(textsOf("x as u32", "keyword").includes("as"));
  });

  it("highlights built-in types", () => {
    const types = textsOf("let x: u32 = 0; let s: string;", "typeName");
    assert.deepEqual(new Set(types), new Set(["u32", "string"]));
  });

  it("highlights line comments", () => {
    const comments = textsOf("fn x() {} // todo", "comment");
    assert.equal(comments.length, 1);
    assert.equal(comments[0], "// todo");
  });

  it("highlights strings and blob strings", () => {
    const strings = textsOf(`print("hi\\n"); blit(b"\\x00");`, "string");
    assert.ok(strings.some((s) => s.includes("hi")));
    assert.ok(strings.some((s) => s.startsWith('b"') || s.includes("\\x00")));
  });

  it("highlights numbers with optional suffix", () => {
    const numbers = textsOf("proc_exit(0u32);", "number");
    assert.ok(numbers.includes("0u32"));
  });

  it("highlights operators and meta @export", () => {
    const tokens = tokenizeCapylang("@export\nfn f() -> u32 { x :: y }");
    const names = new Set(tokens.map((t) => t.name));
    assert.ok(names.has("meta"));
    assert.ok(textsOf("@export\nfn f() -> u32 { x :: y }", "operator").includes("->"));
    assert.ok(textsOf("@export\nfn f() -> u32 { x :: y }", "operator").includes("::"));
  });

  it("does not treat JS-only words as Capylang keywords", () => {
    const keywords = textsOf("const x = () => 1;", "keyword");
    assert.equal(keywords.includes("const"), false);
    assert.ok(!keywords.some((k) => k === "=>"));
  });

  it("tokenizes a WASI-style sample without throwing", () => {
    const sample = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;
    const tokens = tokenizeCapylang(sample);
    assert.ok(tokens.length > 0);
    assert.ok(textsOf(sample, "keyword").includes("import"));
    assert.ok(textsOf(sample, "keyword").includes("fn"));
    assert.ok(textsOf(sample, "typeName").includes("u32"));
    assert.ok(textsOf(sample, "number").includes("0u32"));
  });
});
