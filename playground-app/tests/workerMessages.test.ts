import { describe, expect, it } from "vitest";
import {
  parseCompileRequest,
  parseCompileResponse,
} from "../src/lib/compile/compileMessages";
import { parseRunRequest, parseRunResponse } from "../src/lib/runtime/runMessages";

describe("worker message protocol", () => {
  it("accepts a valid compile request/response", () => {
    const req = parseCompileRequest({
      type: "compile",
      id: 1,
      source: "fn x() {}",
      compilerUrl: "http://localhost/capylang.wasm",
    });
    expect(req).toBeTruthy();
    expect(req!.id).toBe(1);

    const res = parseCompileResponse({
      type: "result",
      id: 1,
      ok: true,
      exitCode: 0,
      stdout: "",
      stderr: "",
      wasm: new ArrayBuffer(0),
      ms: 12,
    });
    expect(res).toBeTruthy();
    expect(res!.ok).toBe(true);
  });

  it("rejects malformed compile messages", () => {
    expect(parseCompileRequest({ type: "compile", id: 1 })).toBeNull();
    expect(parseCompileResponse({ type: "result", id: 1, ok: true })).toBeNull();
    expect(parseCompileResponse({ type: "result", id: "1", ok: true })).toBeNull();
  });

  it("accepts a valid run request/response", () => {
    const req = parseRunRequest({
      type: "run",
      id: 2,
      wasm: new ArrayBuffer(4),
    });
    expect(req).toBeTruthy();
    expect(req!.id).toBe(2);

    const res = parseRunResponse({
      type: "result",
      id: 2,
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: "trap",
    });
    expect(res).toBeTruthy();
    expect(res!.exitCode).toBe(1);
  });

  it("rejects malformed run messages", () => {
    expect(parseRunRequest({ type: "run", id: 1, wasm: new Uint8Array(1) })).toBeNull();
    expect(parseRunResponse({ type: "result", id: 1 })).toBeNull();
  });
});
