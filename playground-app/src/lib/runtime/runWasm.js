import { WasiPreview1, WASIProcExit } from "../compile/easywasm_wasi.js";

function formatError(err) {
  const name = err?.name || "Error";
  const message = err?.message || String(err);
  const stack = err?.stack ? `\n${err.stack}` : "";
  return `[${name}] ${message}${stack}`;
}

function extractExitCode(err) {
  if (err instanceof WASIProcExit) return err.code;
  if (err && typeof err.code === "number" && /exit/i.test(String(err.message || ""))) {
    return err.code;
  }
  if (err?.name === "WASIProcExit" && typeof err.code === "number") return err.code;
  return null;
}

function bindWasiImports(wasi) {
  const preview1 = {};
  const proto = Object.getPrototypeOf(wasi);
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue;
    const value = wasi[key];
    if (typeof value === "function") {
      preview1[key] = value.bind(wasi);
    }
  }
  for (const key of Object.keys(wasi)) {
    const value = wasi[key];
    if (typeof value === "function" && !preview1[key]) {
      preview1[key] = value.bind(wasi);
    }
  }
  return preview1;
}

/**
 * Run a Capylang-generated WASI module (CLI only)
 * @param {Uint8Array|ArrayBuffer} wasmBytes
 * @returns {Promise<{ ok: boolean, exitCode: number, stdout: string, stderr: string }>}
 */
export async function runWasm(wasmBytes) {
  const bytes =
    wasmBytes instanceof Uint8Array
      ? wasmBytes
      : new Uint8Array(wasmBytes);

  let stdout = "";
  let stderr = "";
  const decoder = new TextDecoder();

  const wasi = new WasiPreview1({
    args: ["program.wasm"],
    env: {},
  });
  wasi.stdout = (buf) => {
    stdout += decoder.decode(buf);
  };
  wasi.stderr = (buf) => {
    stderr += decoder.decode(buf);
  };

  const importObject = { wasi_snapshot_preview1: bindWasiImports(wasi) };
  const { instance } = await WebAssembly.instantiate(bytes, importObject);

  let exitCode = 0;
  try {
    exitCode = wasi.start(instance.exports);
  } catch (err) {
    const code = extractExitCode(err);
    if (code !== null) {
      exitCode = code;
    } else {
      stderr += (stderr ? "\n" : "") + formatError(err);
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
