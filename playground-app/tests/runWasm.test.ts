import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { compileCapylang } from "../src/lib/compile/compileCapylang";
import { parseWasmFunctionNames } from "../src/lib/runtime/wasmNames";
import { runWasm } from "../src/lib/runtime/runWasm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(root, "public", "capylang.wasm");
const crashPath = join(root, "..", "examples", "crash.capy");

const SOURCE = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;

describe("runWasm", () => {
  let program: Uint8Array;
  let compilerBytes: Uint8Array;

  beforeAll(async () => {
    expect(existsSync(wasmPath), `missing ${wasmPath}, copy from build/capylang.wasm`).toBe(
      true,
    );
    compilerBytes = new Uint8Array(readFileSync(wasmPath));
    const compiled = await compileCapylang({
      source: SOURCE,
      compilerModule: compilerBytes,
    });
    expect(compiled.ok).toBe(true);
    expect(compiled.wasm).toBeTruthy();
    program = compiled.wasm!;
  });

  it("runs a compiled WASI module and returns exit 0", async () => {
    const result = await runWasm(program);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("reports crash.capy traps with named WASM backtrace", async () => {
    expect(existsSync(crashPath), `missing ${crashPath}`).toBe(true);
    const compiled = await compileCapylang({
      source: readFileSync(crashPath, "utf8"),
      compilerModule: compilerBytes,
    });
    expect(compiled.ok).toBe(true);
    expect(compiled.wasm).toBeTruthy();
    expect([...parseWasmFunctionNames(compiled.wasm!).values()]).toEqual(
      expect.arrayContaining(["level3", "level2", "level1", "_start"]),
    );

    const result = await runWasm(compiled.wasm!);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("error while executing at wasm backtrace:");
    expect(result.stderr).toContain("level3");
    expect(result.stderr).toContain("level2");
    expect(result.stderr).toContain("level1");
    expect(result.stderr).toContain("_start");
    expect(result.stderr).toMatch(/wasm trap: unreachable/i);
    expect(result.stderr).not.toMatch(/file:\/\//);
    expect(result.stderr).not.toMatch(/easywasm_wasi/);
  });
});
