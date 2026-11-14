export class MemoryFS {
  files: Map<string, Uint8Array>;
  dirs: Set<string>;
  ensureDir(path: string): void;
  writeFileSync(path: string, data: string | Uint8Array | ArrayBuffer): void;
  writeAt(path: string, data: string | Uint8Array | ArrayBuffer, offset: number): void;
  readFileSync(path: string): Uint8Array;
  existsSync(path: string): boolean;
  mkdirSync(path: string): void;
  unlinkSync(path: string): void;
}
