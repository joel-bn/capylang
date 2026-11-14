import { WasiPreview1 } from "../compile/easywasm_wasi.js";
import { bindWasiImports, extractExitCode } from "../wasiHelpers.js";
import { formatRuntimeError } from "./formatRuntimeError.js";

export type RunWasmResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

/** Run a Capylang-generated WASI module (CLI only). */
export async function runWasm(
  wasmBytes: Uint8Array | ArrayBuffer,
): Promise<RunWasmResult> {
  const bytes = wasmBytes instanceof Uint8Array ? wasmBytes : new Uint8Array(wasmBytes);

  let stdout = "";
  let stderr = "";
  const decoder = new TextDecoder();

  const wasi = new WasiPreview1({
    args: ["program.wasm"],
    env: {},
  });
  wasi.stdout = (buf: BufferSource) => {
    stdout += decoder.decode(buf);
  };
  wasi.stderr = (buf: BufferSource) => {
    stderr += decoder.decode(buf);
  };

  const importObject: WebAssembly.Imports = {
    wasi_snapshot_preview1: bindWasiImports(wasi),
  };
  const { instance } = await WebAssembly.instantiate(
    bytes as BufferSource,
    importObject,
  );

  let exitCode = 0;
  try {
    exitCode = wasi.start(instance.exports);
  } catch (err) {
    const code = extractExitCode(err);
    if (code !== null) {
      exitCode = code;
    } else {
      stderr += (stderr ? "\n" : "") + formatRuntimeError(err, bytes);
      return { ok: false, exitCode: 1, stdout, stderr };
    }
  }

  return {
    ok: exitCode === 0,
    exitCode,
    stdout,
    stderr,
  };
}
