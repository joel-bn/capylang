import type { WasiFdEntry } from "./wasiFd.js";

export type { WasiFdEntry, WasiFdHandle } from "./wasiFd.js";

export class WASIProcExit extends Error {
  code: number;
  constructor(code: number);
}

export type WasiPreview1Options = {
  args?: string[];
  env?: Record<string, string>;
  fs?: unknown;
};

export class WasiPreview1 {
  constructor(options?: WasiPreview1Options);
  stdout: (buf: BufferSource) => void;
  stderr: (buf: BufferSource) => void;
  fds: Map<number, WasiFdEntry>;
  wasm: { memory: WebAssembly.Memory };
  fd_write: (
    fd: number,
    iovs: number,
    iovsLen: number,
    nwrittenPtr: number,
  ) => number;
  start(exports: WebAssembly.Exports): number;
}
