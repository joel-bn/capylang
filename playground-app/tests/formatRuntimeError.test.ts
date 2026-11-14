import { describe, expect, it } from "vitest";
import {
  formatRuntimeError,
  parseWasmStackFrames,
} from "../src/lib/runtime/formatRuntimeError";

describe("formatRuntimeError", () => {
  it("formats Chrome/V8 RuntimeError like wasmtime", () => {
    const err = new WebAssembly.RuntimeError("unreachable");
    err.stack = [
      "RuntimeError: unreachable",
      "    at level3 (wasm://wasm/ca3d539e:wasm-function[2]:0xad)",
      "    at level2 (wasm://wasm/ca3d539e:wasm-function[3]:0xb5)",
      "    at level1 (wasm://wasm/ca3d539e:wasm-function[4]:0xbc)",
      "    at _start (wasm://wasm/ca3d539e:wasm-function[5]:0xc3)",
      "    at o.start (http://localhost:5173/src/lib/compile/easywasm_wasi.js:7:6218)",
      "    at runWasm (http://localhost:5173/src/lib/runtime/runWasm.ts:83:8)",
    ].join("\n");

    expect(formatRuntimeError(err)).toBe(
      [
        "error while executing at wasm backtrace:",
        "   0:     0xad - level3",
        "   1:     0xb5 - level2",
        "   2:     0xbc - level1",
        "   3:     0xc3 - _start",
        "wasm trap: unreachable",
      ].join("\n"),
    );
  });

  it("formats Firefox/SpiderMonkey RuntimeError like wasmtime", () => {
    const err = new WebAssembly.RuntimeError("unreachable executed");
    err.stack = [
      "RuntimeError: unreachable executed",
      "level3@http://localhost:5173/blob:foo:wasm-function[2]:0xad",
      "level2@http://localhost:5173/blob:foo:wasm-function[3]:0xb5",
      "level1@http://localhost:5173/blob:foo:wasm-function[4]:0xbc",
      "_start@http://localhost:5173/blob:foo:wasm-function[5]:0xc3",
      "start@http://localhost:5173/src/lib/compile/easywasm_wasi.js:7:6218",
      "runWasm@http://localhost:5173/src/lib/runtime/runWasm.ts:118:14",
    ].join("\n");

    expect(formatRuntimeError(err)).toBe(
      [
        "error while executing at wasm backtrace:",
        "   0:     0xad - level3",
        "   1:     0xb5 - level2",
        "   2:     0xbc - level1",
        "   3:     0xc3 - _start",
        "wasm trap: unreachable executed",
      ].join("\n"),
    );
  });

  it("resolves Firefox wasm-function indices via the name map", () => {
    const names = new Map<number, string>([
      [2, "level3"],
      [3, "level2"],
    ]);
    const frames = parseWasmStackFrames(
      [
        "@http://localhost/app.wasm:wasm-function[2]:0xad",
        "@http://localhost/app.wasm:wasm-function[3]:0xb5",
      ].join("\n"),
      names,
    );
    expect(frames).toEqual([
      { name: "level3", offset: "ad" },
      { name: "level2", offset: "b5" },
    ]);
  });

  it("falls back to wasm trap line when no WASM frames exist", () => {
    const err = new WebAssembly.RuntimeError("unreachable executed");
    err.stack =
      "RuntimeError: unreachable executed\nstart@http://localhost/easywasm_wasi.js:7:1";
    expect(formatRuntimeError(err)).toBe("wasm trap: unreachable executed");
  });
});
