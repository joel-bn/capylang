import { WasiPreview1, WASIProcExit } from "./easywasm_wasi.js";
import { MemoryFS } from "./memory_fs.js";

const SAMPLE_SOURCE = `import wasi_snapshot_preview1::proc_exit(exit_code: u32) as proc_exit;

@export
fn _start() {
    proc_exit(0u32);
}
`;

/**
 * Patch easywasm file writes so chunked fd_write respects file position.
 * Upstream writeFileSync replaces the whole file per chunk.
 */
function patchPositionalWrites(wasi, memfs) {
  const original = wasi.fd_write.bind(wasi);
  wasi.fd_write = (fd, iovs, iovsLen, nwrittenPtr) => {
    const entry = wasi.fds.get(fd);
    if (!entry || entry.type === "stdio") {
      return original(fd, iovs, iovsLen, nwrittenPtr);
    }

    const view = new DataView(wasi.wasm.memory.buffer);
    const bytes = new Uint8Array(wasi.wasm.memory.buffer);
    let total = 0;
    const chunks = [];
    for (let i = 0; i < iovsLen; i++) {
      const base = iovs + 8 * i;
      const ptr = view.getUint32(base, true);
      const len = view.getUint32(base + 4, true);
      chunks.push(bytes.subarray(ptr, ptr + len));
      total += len;
    }
    let payload;
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

    const path = entry.handle.path;
    const offset = Number(entry.handle.position ?? 0);
    memfs.writeAt(path, payload, offset);
    entry.handle.position = offset + total;
    view.setUint32(nwrittenPtr, total, true);
    return 0;
  };
}

/**
 * Compile Capylang source in-browser (or Node) via capylang.wasm + WASI.
 * @param {object} options
 * @param {string} [options.source]
 * @param {string|URL} [options.compilerUrl]
 * @param {WebAssembly.Module|Uint8Array|ArrayBuffer} [options.compilerModule]
 * @returns {Promise<{ ok: boolean, exitCode: number, wasm: Uint8Array|null, stdout: string, stderr: string }>}
 */
export async function compileCapylang(options = {}) {
  const source = options.source ?? SAMPLE_SOURCE;
  const memfs = new MemoryFS();
  memfs.writeFileSync("/in.capy", source);
  // easywasm path_open requires the path to exist before open
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

  let moduleBytes;
  if (options.compilerModule instanceof WebAssembly.Module) {
    moduleBytes = null;
  } else if (options.compilerModule) {
    moduleBytes = options.compilerModule;
  } else {
    const url = options.compilerUrl ?? "/public/capylang.wasm";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch compiler: ${res.status} ${url}`);
    }
    moduleBytes = await res.arrayBuffer();
  }

  const importObject = { wasi_snapshot_preview1: wasi };
  const { instance } =
    options.compilerModule instanceof WebAssembly.Module
      ? await WebAssembly.instantiate(options.compilerModule, importObject)
      : await WebAssembly.instantiate(moduleBytes, importObject);

  let exitCode = 0;
  try {
    exitCode = wasi.start(instance.exports);
  } catch (err) {
    if (err instanceof WASIProcExit) {
      exitCode = err.code;
    } else {
      throw err;
    }
  }

  let wasm = null;
  if (exitCode === 0) {
    try {
      wasm = memfs.readFileSync("/out.wasm");
      if (wasm.byteLength === 0) {
        wasm = null;
        stderr += "\n[spike] out.wasm is empty after exit 0\n";
        exitCode = 1;
      }
    } catch (e) {
      stderr += `\n[spike] missing out.wasm: ${e}\n`;
      exitCode = 1;
    }
  }

  return {
    ok: exitCode === 0 && wasm != null,
    exitCode,
    wasm,
    stdout,
    stderr,
    sampleSource: source,
  };
}

export { SAMPLE_SOURCE };
