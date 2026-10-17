/** Minimal in-memory FS for easywasm WasiPreview1 (sync Node-like API). */

function normalize(path) {
  if (!path) return "/";
  let p = String(path).replace(/\\/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === "string") return new TextEncoder().encode(data);
  return new Uint8Array(data);
}

export class MemoryFS {
  constructor() {
    /** @type {Map<string, Uint8Array>} */
    this.files = new Map();
    /** @type {Set<string>} */
    this.dirs = new Set(["/"]);
  }

  ensureDir(path) {
    const p = normalize(path);
    if (p === "/") return;
    const parts = p.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur += "/" + part;
      this.dirs.add(cur);
    }
  }

  writeFileSync(path, data) {
    const p = normalize(path);
    const parent = p.slice(0, p.lastIndexOf("/")) || "/";
    this.ensureDir(parent);
    this.files.set(p, toBytes(data));
  }

  /** Write/extend at offset (fixes easywasm chunked fd_write overwrite). */
  writeAt(path, data, offset) {
    const p = normalize(path);
    const chunk = toBytes(data);
    const existing = this.files.get(p) ?? new Uint8Array(0);
    const end = offset + chunk.length;
    const next = new Uint8Array(Math.max(existing.length, end));
    next.set(existing, 0);
    next.set(chunk, offset);
    this.files.set(p, next);
  }

  readFileSync(path) {
    const p = normalize(path);
    const data = this.files.get(p);
    if (!data) {
      const err = new Error(`ENOENT: ${p}`);
      err.code = "ENOENT";
      throw err;
    }
    return data;
  }

  existsSync(path) {
    const p = normalize(path);
    return this.files.has(p) || this.dirs.has(p);
  }

  statSync(path) {
    const p = normalize(path);
    if (this.dirs.has(p) && !this.files.has(p)) {
      return {
        isFile: () => false,
        isDirectory: () => true,
        isSymbolicLink: () => false,
        isCharacterDevice: () => false,
        isBlockDevice: () => false,
        isFIFO: () => false,
        size: 0,
        atimeMs: 0,
        mtimeMs: 0,
        ctimeMs: 0,
        dev: 0,
        ino: 0,
        nlink: 1,
      };
    }
    const data = this.files.get(p);
    if (!data) {
      const err = new Error(`ENOENT: ${p}`);
      err.code = "ENOENT";
      throw err;
    }
    return {
      isFile: () => true,
      isDirectory: () => false,
      isSymbolicLink: () => false,
      isCharacterDevice: () => false,
      isBlockDevice: () => false,
      isFIFO: () => false,
      size: data.length,
      atimeMs: 0,
      mtimeMs: 0,
      ctimeMs: 0,
      dev: 0,
      ino: 0,
      nlink: 1,
    };
  }

  mkdirSync(path) {
    this.ensureDir(normalize(path));
  }

  readdirSync() {
    return [];
  }

  unlinkSync(path) {
    this.files.delete(normalize(path));
  }

  rmdirSync() {}
  renameSync() {}
  truncateSync(path, len = 0) {
    const p = normalize(path);
    const data = this.files.get(p) ?? new Uint8Array(0);
    this.files.set(p, data.slice(0, len));
  }
  appendFileSync(path, data) {
    const p = normalize(path);
    const prev = this.files.get(p) ?? new Uint8Array(0);
    const chunk = toBytes(data);
    const next = new Uint8Array(prev.length + chunk.length);
    next.set(prev, 0);
    next.set(chunk, prev.length);
    this.files.set(p, next);
  }
  linkSync() {}
  symlinkSync() {}
  readlinkSync() {
    throw Object.assign(new Error("EINVAL"), { code: "EINVAL" });
  }
  utimesSync() {}
  fsyncSync() {}
  setFlagsSync() {}
}
