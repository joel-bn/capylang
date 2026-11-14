import { WasiPreview1 } from "./easywasm_wasi.js";
import { MemoryFS } from "./memory_fs.js";
import type { WasiFdEntry, WasiFdHandle } from "./wasiFd.js";
import { bindWasiImports, extractExitCode } from "../wasiHelpers.js";

export type CompileCapylangOptions = {
  source: string;
  compilerUrl?: string | URL;
  compilerModule?: WebAssembly.Module | Uint8Array | ArrayBuffer;
};

export type CompileCapylangResult = {
  ok: boolean;
  exitCode: number;
  wasm: Uint8Array | null;
  stdout: string;
  stderr: string;
};

function formatError(err: unknown) {
  const e = err as { name?: string; message?: string; stack?: string };
  const name = e?.name || "Error";
  const message = e?.message || String(err);
  const stack = e?.stack ? `\n${e.stack}` : "";
  return `\n[${name}] ${message}${stack}\n`;
}

/**
 * Patch easywasm file writes so chunked fd_write respects file position.
 * Upstream writeFileSync replaces the whole file per chunk.
 */
function fileHandleOf(entry: WasiFdEntry | undefined): WasiFdHandle | undefined {
  if (!entry || entry.type === "stdio") return undefined;
  return entry.handle;
}

function patchPositionalWrites(wasi: WasiPreview1, memfs: MemoryFS) {
  const original = wasi.fd_write.bind(wasi);
  wasi.fd_write = (fd, iovs, iovsLen, nwrittenPtr) => {
    const entry = wasi.fds.get(fd) as WasiFdEntry | undefined;
    const handle = fileHandleOf(entry);
    if (!handle) {
      return original(fd, iovs, iovsLen, nwrittenPtr);
    }

    const view = new DataView(wasi.wasm.memory.buffer);
    const bytes = new Uint8Array(wasi.wasm.memory.buffer);
    let total = 0;
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < iovsLen; i++) {
      const base = iovs + 8 * i;
      const ptr = view.getUint32(base, true);
      const len = view.getUint32(base + 4, true);
      chunks.push(bytes.subarray(ptr, ptr + len));
      total += len;
    }
    let payload: Uint8Array;
    if (chunks.length === 1) {
      payload = chunks[0];
    } else {
      payload = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        payload.set(c, off);
        off += c.length;
      }
    }

    const path = handle.path;
    const offset = Number(handle.position ?? 0);
    memfs.writeAt(path, payload, offset);
    handle.position = offset + total;
    view.setUint32(nwrittenPtr, total, true);
    return 0;
  };
}

export async function compileCapylang(
  options: CompileCapylangOptions,
): Promise<CompileCapylangResult> {
  const source = options.source;
  if (typeof source !== "string") {
    throw new Error("compileCapylang: source string required");
  }

  const memfs = new MemoryFS();
  memfs.writeFileSync("/in.capy", source);
  memfs.writeFileSync("/out.wasm", new Uint8Array(0));

  let stdout = "";
  let stderr = "";
  const decoder = new TextDecoder();

  const wasi = new WasiPreview1({
    args: ["capylang.wasm", "-i", "/in.capy", "-o", "/out.wasm"],
    env: {},
    fs: memfs,
  });
  wasi.stdout = (buf) => {
    stdout += decoder.decode(buf);
  };
  wasi.stderr = (buf) => {
    stderr += decoder.decode(buf);
  };
  patchPositionalWrites(wasi, memfs);

  const importObject: WebAssembly.Imports = {
    wasi_snapshot_preview1: bindWasiImports(wasi),
  };

  let instance: WebAssembly.Instance;
  if (options.compilerModule instanceof WebAssembly.Module) {
    instance = await WebAssembly.instantiate(options.compilerModule, importObject);
  } else {
    let bytes: ArrayBuffer;
    if (options.compilerModule) {
      bytes = new Uint8Array(
        options.compilerModule instanceof ArrayBuffer
          ? new Uint8Array(options.compilerModule)
          : options.compilerModule,
      ).slice().buffer;
    } else {
      const url = options.compilerUrl ?? "/capylang.wasm";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch compiler: ${res.status} ${url}`);
      }
      bytes = await res.arrayBuffer();
    }
    const result = await WebAssembly.instantiate(bytes, importObject);
    instance = result.instance;
  }

  let exitCode = 0;
  try {
    exitCode = wasi.start(instance.exports);
  } catch (err) {
    const code = extractExitCode(err);
    if (code !== null) {
      exitCode = code;
    } else {
      stderr += formatError(err);
      return {
        ok: false,
        exitCode: 1,
        wasm: null,
        stdout,
        stderr,
      };
    }
  }

  let wasm: Uint8Array | null = null;
  if (exitCode === 0) {
    try {
      wasm = memfs.readFileSync("/out.wasm");
      if (wasm.byteLength === 0) {
        wasm = null;
        stderr += "\nout.wasm is empty after exit 0\n";
        exitCode = 1;
      }
    } catch (e) {
      stderr += `\nmissing out.wasm: ${e}\n`;
      exitCode = 1;
    }
  }

  return {
    ok: exitCode === 0 && wasm != null,
    exitCode,
    wasm,
    stdout,
    stderr,
  };
}
