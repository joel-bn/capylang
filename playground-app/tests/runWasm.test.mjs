import { readFileSync, existsSync } from "node:fs";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileCapylang } from "../src/lib/compile/compileCapylang.js";
import { runWasm } from "../src/lib/runtime/runWasm.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmPath = join(root, "public", "capylang.wasm");

const SOURCE = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;

describe("runWasm", () => {
  /** @type {Uint8Array} */
  let program;

  before(async () => {
    assert.ok(existsSync(wasmPath), `missing ${wasmPath}, copy from build/capylang.wasm`);
    const compiled = await compileCapylang({
      source: SOURCE,
      compilerModule: readFileSync(wasmPath),
    });
    assert.equal(compiled.ok, true);
    program = compiled.wasm;
  });

  it("runs a compiled WASI module and returns exit 0", async () => {
    const result = await runWasm(program);
    assert.equal(result.ok, true);
    assert.equal(result.exitCode, 0);
  });
});
