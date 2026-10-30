import { readFileSync, existsSync } from "node:fs";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileCapylang } from "../src/lib/compile/compileCapylang.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(root, "public", "capylang.wasm");

const OK_SOURCE = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;

const BAD_SOURCE = `fn broken( {
`;

describe("compileCapylang", () => {
  /** @type {Buffer} */
  let compilerBytes;

  before(() => {
    assert.ok(
      existsSync(wasmPath),
      `missing ${wasmPath}, copy from build/capylang.wasm`,
    );
    compilerBytes = readFileSync(wasmPath);
  });

  it("compiles a tiny program to wasm", async () => {
    const result = await compileCapylang({
      source: OK_SOURCE,
      compilerModule: compilerBytes,
    });
    assert.equal(result.ok, true);
    assert.equal(result.exitCode, 0);
    assert.ok(result.wasm);
    assert.equal(result.wasm.byteLength > 0, true);
    assert.deepEqual([...result.wasm.slice(0, 4)], [0x00, 0x61, 0x73, 0x6d]);
  });

  it("reports failure for invalid source", async () => {
    const result = await compileCapylang({
      source: BAD_SOURCE,
      compilerModule: compilerBytes,
    });
    assert.equal(result.ok, false);
    assert.notEqual(result.exitCode, 0);
    assert.equal(result.wasm, null);
  });

  it("works with a precompiled WebAssembly.Module", async () => {
    const mod = await WebAssembly.compile(compilerBytes);
    const result = await compileCapylang({
      source: OK_SOURCE,
      compilerModule: mod,
    });
    assert.equal(result.ok, true);
    assert.ok(result.wasm);
    assert.deepEqual([...result.wasm.slice(0, 4)], [0x00, 0x61, 0x73, 0x6d]);
  });
});
