import { formatRuntimeError } from "./formatRuntimeError";
import { type RunResponse, parseRunRequest } from "./runMessages";
import { runWasm } from "./runWasm";

type WorkerScope = {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(message: RunResponse, transfer?: Transferable[]): void;
};

const workerSelf = self as unknown as WorkerScope;

workerSelf.onmessage = async (event: MessageEvent) => {
  const request = parseRunRequest(event.data);
  if (!request) return;

  const { id, wasm } = request;
  try {
    const result = await runWasm(wasm);
    const response: RunResponse = {
      type: "result",
      id,
      ok: result.ok,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
    workerSelf.postMessage(response);
  } catch (err) {
    const response: RunResponse = {
      type: "result",
      id,
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: formatRuntimeError(err),
    };
    workerSelf.postMessage(response);
  }
};
