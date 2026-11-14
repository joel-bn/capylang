import { compileCapylang } from "./compileCapylang";
import {
  type CompileResponse,
  parseCompileRequest,
} from "./compileMessages";

type WorkerScope = {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(message: CompileResponse, transfer?: Transferable[]): void;
  location: { origin: string };
};

const workerSelf = self as unknown as WorkerScope;

let cachedModule: WebAssembly.Module | null = null;
let loadPromise: Promise<WebAssembly.Module> | null = null;

async function getCompilerModule(compilerUrl: string) {
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

workerSelf.onmessage = async (event: MessageEvent) => {
  const request = parseCompileRequest(event.data);
  if (!request) return;

  const { id, source, compilerUrl } = request;
  const t0 = performance.now();

  try {
    const compilerModule = await getCompilerModule(compilerUrl);
    const result = await compileCapylang({ source, compilerModule });
    const ms = Math.round(performance.now() - t0);

    const transfer: Transferable[] = [];
    let wasmBuffer: ArrayBuffer | null = null;
    if (result.wasm) {
      wasmBuffer = new Uint8Array(result.wasm).slice().buffer;
      transfer.push(wasmBuffer);
    }

    const response: CompileResponse = {
      type: "result",
      id,
      ok: result.ok,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      wasm: wasmBuffer,
      ms,
    };
    workerSelf.postMessage(response, transfer);
  } catch (err) {
    const e = err as { name?: string; message?: string; stack?: string };
    const name = e?.name || "Error";
    const message = e?.message || String(err);
    const stack = e?.stack || "";
    const response: CompileResponse = {
      type: "result",
      id,
      ok: false,
      exitCode: -1,
      stdout: "",
      stderr: `[${name}] ${message}\n${stack}`,
      wasm: null,
      ms: Math.round(performance.now() - t0),
    };
    workerSelf.postMessage(response);
  }
};
