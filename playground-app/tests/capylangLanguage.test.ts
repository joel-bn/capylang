import { describe, expect, it } from "vitest";
import { capylang, tokenizeCapylang } from "../src/lib/editor/capylangLanguage";

function textsOf(source: string, name: string) {
  return tokenizeCapylang(source)
    .filter((t) => t.name === name)
    .map((t) => t.text);
}

describe("capylangLanguage", () => {
  it("exports LanguageSupport via capylang()", () => {
    const support = capylang();
    expect(support.language.name).toBe("capylang");
  });

  it("highlights Capylang keywords from the lexer set", () => {
    const src = "fn foo() {\n  let mut x = 1;\n  return x;\n}";
    const keywords = textsOf(src, "keyword");
    expect(new Set(keywords)).toEqual(new Set(["fn", "let", "mut", "return"]));
  });

  it("highlights as (conversion) as keyword", () => {
    expect(textsOf("x as u32", "keyword")).toContain("as");
  });

  it("highlights built-in types", () => {
    const types = textsOf("let x: u32 = 0; let s: string;", "typeName");
    expect(new Set(types)).toEqual(new Set(["u32", "string"]));
  });

  it("highlights line comments", () => {
    const comments = textsOf("fn x() {} // todo", "comment");
    expect(comments).toHaveLength(1);
    expect(comments[0]).toBe("// todo");
  });

  it("highlights strings and blob strings", () => {
    const strings = textsOf(`print("hi\\n"); blit(b"\\x00");`, "string");
    expect(strings.some((s) => s.includes("hi"))).toBe(true);
    expect(strings.some((s) => s.startsWith('b"') || s.includes("\\x00"))).toBe(
      true,
    );
  });

  it("highlights numbers with optional suffix", () => {
    expect(textsOf("proc_exit(0u32);", "number")).toContain("0u32");
  });

  it("highlights operators and meta @export", () => {
    const src = "@export\nfn f() -> u32 { x :: y }";
    const names = new Set(tokenizeCapylang(src).map((t) => t.name));
    expect(names.has("meta")).toBe(true);
    expect(textsOf(src, "operator")).toContain("->");
    expect(textsOf(src, "operator")).toContain("::");
  });

  it("does not treat JS-only words as Capylang keywords", () => {
    const keywords = textsOf("const x = () => 1;", "keyword");
    expect(keywords.includes("const")).toBe(false);
    expect(keywords.some((k) => k === "=>")).toBe(false);
  });

  it("tokenizes a WASI-style sample without throwing", () => {
    const sample = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;
    const tokens = tokenizeCapylang(sample);
    expect(tokens.length).toBeGreaterThan(0);
    expect(textsOf(sample, "keyword")).toContain("import");
    expect(textsOf(sample, "keyword")).toContain("fn");
    expect(textsOf(sample, "typeName")).toContain("u32");
    expect(textsOf(sample, "number")).toContain("0u32");
  });
});
