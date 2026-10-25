import { compileCapylang } from "./compileCapylang.js";

/** @type {WebAssembly.Module | null} */
let cachedModule = null;
let loadPromise = null;

async function getCompilerModule(compilerUrl) {
  if (cachedModule) return cachedModule;
  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(compilerUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch compiler: ${res.status} ${compilerUrl}`);
      }
      const bytes = await res.arrayBuffer();
      cachedModule = await WebAssembly.compile(bytes);
      return cachedModule;
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "compile") return;

  const { id, source, compilerUrl } = msg;
  const t0 = performance.now();

  try {
    const compilerModule = await getCompilerModule(
      compilerUrl || `${self.location.origin}/capylang.wasm`,
    );
    const result = await compileCapylang({ source, compilerModule });
    const ms = Math.round(performance.now() - t0);

    /** @type {Transferable[]} */
    const transfer = [];
    let wasmBuffer = null;
    if (result.wasm) {
      wasmBuffer = result.wasm.buffer.slice(
        result.wasm.byteOffset,
        result.wasm.byteOffset + result.wasm.byteLength,
      );
      transfer.push(wasmBuffer);
    }

    self.postMessage(
      {
        type: "result",
        id,
        ok: result.ok,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        wasm: wasmBuffer,
        ms,
      },
      transfer,
    );
  } catch (err) {
    const name = err?.name || "Error";
    const message = err?.message || String(err);
    const stack = err?.stack || "";
    self.postMessage({
      type: "result",
      id,
      ok: false,
      exitCode: -1,
      stdout: "",
      stderr: `[${name}] ${message}\n${stack}`,
      wasm: null,
      ms: Math.round(performance.now() - t0),
    });
  }
};
