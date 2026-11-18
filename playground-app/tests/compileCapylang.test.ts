import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { compileCapylang } from "../src/lib/compile/compileCapylang";

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
  let compilerBytes: Uint8Array;

  beforeAll(() => {
    expect(existsSync(wasmPath), `missing ${wasmPath}, copy from build/capylang.wasm`).toBe(
      true,
    );
    compilerBytes = new Uint8Array(readFileSync(wasmPath));
  });

  it("compiles a tiny program to wasm", async () => {
    const result = await compileCapylang({
      source: OK_SOURCE,
      compilerModule: compilerBytes,
    });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.wasm).toBeTruthy();
    expect(result.wasm!.byteLength).toBeGreaterThan(0);
    expect([...result.wasm!.slice(0, 4)]).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });

  it("reports failure for invalid source", async () => {
    const result = await compileCapylang({
      source: BAD_SOURCE,
      compilerModule: compilerBytes,
    });
    expect(result.ok).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.wasm).toBeNull();
  });

  it("works with a precompiled WebAssembly.Module", async () => {
    const mod = await WebAssembly.compile(compilerBytes.slice().buffer);
    const result = await compileCapylang({
      source: OK_SOURCE,
      compilerModule: mod,
    });
    expect(result.ok).toBe(true);
    expect(result.wasm).toBeTruthy();
    expect([...result.wasm!.slice(0, 4)]).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });

  it("resolves include \"/lib/wasi.capy\" from the virtual FS", async () => {
    const INCLUDE_SOURCE = `include "/lib/wasi.capy"

@export
fn _start() {
    proc_exit(0u32);
}
`;
    const result = await compileCapylang({
      source: INCLUDE_SOURCE,
      compilerModule: compilerBytes,
    });
    expect(result.stderr).not.toMatch(/Could not open include file/i);
    expect(result.ok).toBe(true);
    expect(result.wasm).toBeTruthy();
  });
});
