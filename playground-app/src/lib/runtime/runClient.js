let worker = null;
let nextId = 1;
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();

function abortError(message) {
  return new DOMException(message, "AbortError");
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./run.worker.js", import.meta.url), {
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
 * Run a Capylang WASI module on a Web Worker (so it can be terminated).
 * @param {Uint8Array|ArrayBuffer} wasmBytes
 */
export function runWasmAsync(wasmBytes) {
  const bytes =
    wasmBytes instanceof Uint8Array
      ? wasmBytes
      : new Uint8Array(wasmBytes);
  const copy = bytes.slice().buffer;
  const id = nextId++;
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: "run", id, wasm: copy }, [copy]);
  });
}

/** Kill an in-flight runtime worker (infinite loops, hangs). */
export function cancelRun() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const [, entry] of pending) {
    entry.reject(abortError("Run cancelled"));
  }
  pending.clear();
}
