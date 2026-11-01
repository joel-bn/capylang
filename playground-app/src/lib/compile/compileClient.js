let worker = null;
let nextId = 1;
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();

function abortError(message) {
  return new DOMException(message, "AbortError");
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./compile.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "result") return;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      entry.resolve({
        ok: msg.ok,
        exitCode: msg.exitCode,
        stdout: msg.stdout ?? "",
        stderr: msg.stderr ?? "",
        wasm: msg.wasm ? new Uint8Array(msg.wasm) : null,
        ms: msg.ms ?? 0,
      });
    };
    worker.onerror = (err) => {
      for (const [, entry] of pending) {
        entry.reject(err);
      }
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

/**
 * Compile Capylang source on a Web Worker.
 * @param {string} source
 * @param {{ compilerUrl?: string }} [options]
 */
export function compileSource(source, options = {}) {
  const id = nextId++;
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({
      type: "compile",
      id,
      source,
      compilerUrl: options.compilerUrl ?? `${window.location.origin}/capylang.wasm`,
    });
  });
}

/** Kill an in-flight compile worker (hangs, stuck first load). */
export function cancelCompile() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const [, entry] of pending) {
    entry.reject(abortError("Compile cancelled"));
  }
  pending.clear();
}
