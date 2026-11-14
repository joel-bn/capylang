import { WASIProcExit } from "./compile/easywasm_wasi.js";

/** Prefer exit code over instanceof (bundlers can break instanceof across copies). */
export function extractExitCode(err: unknown): number | null {
  if (err instanceof WASIProcExit) return err.code;
  const e = err as { code?: number; message?: string; name?: string };
  if (e && typeof e.code === "number" && /exit/i.test(String(e.message || ""))) {
    return e.code;
  }
  if (e?.name === "WASIProcExit" && typeof e.code === "number") return e.code;
  return null;
}

/** Bind WASI methods onto a plain object for reliable WebAssembly imports. */
export function bindWasiImports(wasi: object): WebAssembly.ModuleImports {
  const preview1: WebAssembly.ModuleImports = {};
  const proto = Object.getPrototypeOf(wasi) as object;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue;
    const value = (wasi as Record<string, unknown>)[key];
    if (typeof value === "function") {
      preview1[key] = (value as (...args: never[]) => unknown).bind(wasi);
    }
  }
  for (const key of Object.keys(wasi)) {
    const value = (wasi as Record<string, unknown>)[key];
    if (typeof value === "function" && !preview1[key]) {
      preview1[key] = (value as (...args: never[]) => unknown).bind(wasi);
    }
  }
  return preview1;
}
