/** Shared run-worker protocol (main thread <-> worker). */

export type RunRequest = {
  type: "run";
  id: number;
  wasm: ArrayBuffer;
};

export type RunResponse = {
  type: "result";
  id: number;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

export function parseRunRequest(data: unknown): RunRequest | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "run") return null;
  if (typeof msg.id !== "number" || !Number.isFinite(msg.id)) return null;
  if (!(msg.wasm instanceof ArrayBuffer)) return null;
  return { type: "run", id: msg.id, wasm: msg.wasm };
}

export function parseRunResponse(data: unknown): RunResponse | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "result") return null;
  if (typeof msg.id !== "number" || !Number.isFinite(msg.id)) return null;
  if (typeof msg.ok !== "boolean") return null;
  if (typeof msg.exitCode !== "number") return null;
  if (typeof msg.stdout !== "string") return null;
  if (typeof msg.stderr !== "string") return null;
  return {
    type: "result",
    id: msg.id,
    ok: msg.ok,
    exitCode: msg.exitCode,
    stdout: msg.stdout,
    stderr: msg.stderr,
  };
}
