import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { compileCapylang } from "../src/lib/compile/compileCapylang";
import { runWasm } from "../src/lib/runtime/runWasm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(root, "public", "capylang.wasm");

const SOURCE = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;

describe("runWasm", () => {
  let program: Uint8Array;

  beforeAll(async () => {
    expect(existsSync(wasmPath), `missing ${wasmPath}, copy from build/capylang.wasm`).toBe(
      true,
    );
    const compiled = await compileCapylang({
      source: SOURCE,
      compilerModule: new Uint8Array(readFileSync(wasmPath)),
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
});
