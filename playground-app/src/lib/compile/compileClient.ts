import {
  type CompileRequest,
  type CompileResponse,
  parseCompileResponse,
} from "./compileMessages";

export type CompileResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  wasm: Uint8Array | null;
  ms: number;
};

type Pending = {
  resolve: (value: CompileResult) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function abortError(message: string) {
  return new DOMException(message, "AbortError");
}

function toCompileResult(msg: CompileResponse): CompileResult {
  return {
    ok: msg.ok,
    exitCode: msg.exitCode,
    stdout: msg.stdout,
    stderr: msg.stderr,
    wasm: msg.wasm ? new Uint8Array(msg.wasm) : null,
    ms: msg.ms,
  };
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./compile.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent) => {
      const msg = parseCompileResponse(event.data);
      if (!msg) return;
      const entry = pending.get(msg.id);
      if (!entry) {
        console.warn("compile worker: result for unknown id", msg.id);
        return;
      }
      pending.delete(msg.id);
      entry.resolve(toCompileResult(msg));
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

/** Compile Capylang source on a Web Worker. */
export function compileSource(
  source: string,
  options: { compilerUrl?: string } = {},
): Promise<CompileResult> {
  const id = nextId++;
  const w = getWorker();
  const request: CompileRequest = {
    type: "compile",
    id,
    source,
    compilerUrl:
      options.compilerUrl ??
      new URL("capylang.wasm", new URL(import.meta.env.BASE_URL, window.location.href))
        .href,
  };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage(request);
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
