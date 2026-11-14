/** Shared compile-worker protocol (main thread <-> worker). */

export type CompileRequest = {
  type: "compile";
  id: number;
  source: string;
  compilerUrl: string;
};

export type CompileResponse = {
  type: "result";
  id: number;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  wasm: ArrayBuffer | null;
  ms: number;
};

export function parseCompileRequest(data: unknown): CompileRequest | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "compile") return null;
  if (typeof msg.id !== "number" || !Number.isFinite(msg.id)) return null;
  if (typeof msg.source !== "string") return null;
  if (typeof msg.compilerUrl !== "string") return null;
  return {
    type: "compile",
    id: msg.id,
    source: msg.source,
    compilerUrl: msg.compilerUrl,
  };
}

export function parseCompileResponse(data: unknown): CompileResponse | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "result") return null;
  if (typeof msg.id !== "number" || !Number.isFinite(msg.id)) return null;
  if (typeof msg.ok !== "boolean") return null;
  if (typeof msg.exitCode !== "number") return null;
  if (typeof msg.stdout !== "string") return null;
  if (typeof msg.stderr !== "string") return null;
  if (typeof msg.ms !== "number") return null;
  if (!(msg.wasm === null || msg.wasm instanceof ArrayBuffer)) return null;
  return {
    type: "result",
    id: msg.id,
    ok: msg.ok,
    exitCode: msg.exitCode,
    stdout: msg.stdout,
    stderr: msg.stderr,
    wasm: msg.wasm,
    ms: msg.ms,
  };
}
