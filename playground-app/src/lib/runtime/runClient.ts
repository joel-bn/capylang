import { type RunRequest, type RunResponse, parseRunResponse } from "./runMessages";

export type RunResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

type Pending = {
  resolve: (value: RunResult) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function abortError(message: string) {
  return new DOMException(message, "AbortError");
}

function toRunResult(msg: RunResponse): RunResult {
  return {
    ok: msg.ok,
    exitCode: msg.exitCode,
    stdout: msg.stdout,
    stderr: msg.stderr,
  };
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./run.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent) => {
      const msg = parseRunResponse(event.data);
      if (!msg) return;
      const entry = pending.get(msg.id);
      if (!entry) {
        console.warn("run worker: result for unknown id", msg.id);
        return;
      }
      pending.delete(msg.id);
      entry.resolve(toRunResult(msg));
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

/** Run a Capylang WASI module on a Web Worker (so it can be terminated). */
export function runWasmAsync(wasmBytes: Uint8Array | ArrayBuffer): Promise<RunResult> {
  const bytes = wasmBytes instanceof Uint8Array ? wasmBytes : new Uint8Array(wasmBytes);
  const copy = bytes.slice().buffer;
  const id = nextId++;
  const w = getWorker();
  const request: RunRequest = { type: "run", id, wasm: copy };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage(request, [copy]);
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
