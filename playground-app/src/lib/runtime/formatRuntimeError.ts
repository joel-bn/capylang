import { parseWasmFunctionNames } from "./wasmNames.js";

export type WasmStackFrame = { name: string; offset: string };

function toHexOffset(raw: string | undefined): string {
  if (!raw) return "0";
  if (/^0x/i.test(raw)) return raw.slice(2).toLowerCase();
  // pure decimal (Firefox sometimes omits 0x)
  if (/^\d+$/.test(raw)) return Number(raw).toString(16);
  return raw.toLowerCase();
}

function stripWasmModulePrefix(name: string): string {
  const marker = ".wasm.";
  const idx = name.indexOf(marker);
  return idx >= 0 ? name.slice(idx + marker.length) : name;
}

function resolveFrameName(
  rawName: string | null,
  funcIndex: number | null,
  names: Map<number, string>,
): string {
  if (funcIndex != null && names.has(funcIndex)) return names.get(funcIndex)!;
  if (rawName) {
    const cleaned = stripWasmModulePrefix(rawName);
    if (cleaned && !/^wasm-function\[\d+\]$/i.test(cleaned)) return cleaned;
  }
  if (funcIndex != null) return `wasm-function[${funcIndex}]`;
  return rawName || "?";
}

/** Extract `wasm-function[idx]` + optional offset from a location string. */
function parseWasmLocation(
  location: string,
): { funcIndex: number; offsetRaw?: string } | null {
  const marker = "wasm-function[";
  const colonMarker = location.indexOf(`:${marker}`);
  let body: string;
  if (colonMarker >= 0) {
    body = location.slice(colonMarker + 1 + marker.length);
  } else if (location.startsWith(marker)) {
    body = location.slice(marker.length);
  } else {
    // Firefox DevTools-style: …/module.wasm:173 (offset as "line")
    const wasmFile = location.match(/\.wasm:(?:0x)?([0-9a-fA-F]+)$/i);
    if (wasmFile) return { funcIndex: -1, offsetRaw: wasmFile[1] };
    return null;
  }
  const end = body.indexOf("]");
  if (end < 0) return null;
  const funcIndex = Number(body.slice(0, end));
  if (!Number.isFinite(funcIndex)) return null;
  const rest = body.slice(end + 1);
  const off = rest.match(/^:(?:0x)?([0-9a-fA-F]+)/);
  return { funcIndex, offsetRaw: off?.[1] };
}

/**
 * Pull WASM frames from V8 (Chrome) and SpiderMonkey (Firefox) stacks.
 * Host JS frames are dropped.
 */
export function parseWasmStackFrames(
  stack: string | undefined,
  names: Map<number, string> = new Map(),
): WasmStackFrame[] {
  if (!stack) return [];
  const frames: WasmStackFrame[] = [];
  const seen = new Set<string>();

  const push = (
    rawName: string | null,
    funcIndex: number | null,
    offsetRaw: string | undefined,
  ) => {
    const offset = toHexOffset(offsetRaw);
    const name = resolveFrameName(rawName, funcIndex, names);
    const key = `${name}@${offset}`;
    if (seen.has(key)) return;
    seen.add(key);
    frames.push({ name, offset });
  };

  for (const rawLine of stack.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^(?:Error|RuntimeError)\b/.test(line)) continue;

    let rawName: string | null = null;
    let location: string | null = null;

    if (line.startsWith("at ")) {
      // V8: at name (location)
      const rest = line.slice(3);
      if (rest.endsWith(")")) {
        const paren = rest.lastIndexOf(" (");
        if (paren >= 0) {
          rawName = rest.slice(0, paren);
          location = rest.slice(paren + 2, -1);
        }
      } else {
        location = rest;
      }
    } else {
      // Firefox: name@location (name may be empty)
      const at = line.indexOf("@");
      if (at < 0) continue;
      rawName = line.slice(0, at) || null;
      location = line.slice(at + 1);
    }

    if (!location || location === "[native code]") continue;
    const wasm = parseWasmLocation(location);
    if (!wasm) continue;

    // .wasm:offset frames without function index still carry a useful name
    const funcIndex = wasm.funcIndex >= 0 ? wasm.funcIndex : null;
    push(rawName, funcIndex, wasm.offsetRaw);
  }

  return frames;
}

/**
 * Format runtime failures similar to wasmtime: WASM backtrace + trap line.
 * Host JS frames from the browser/worker are omitted.
 */
export function formatRuntimeError(
  err: unknown,
  wasmBytes?: Uint8Array,
): string {
  const e = err as { name?: string; message?: string; stack?: string };
  const name = e?.name || "Error";
  const message = (e?.message || String(err)).trim() || name;
  const isTrap =
    name === "RuntimeError" ||
    (typeof WebAssembly !== "undefined" &&
      err instanceof WebAssembly.RuntimeError);

  if (!isTrap) {
    return `[${name}] ${message}`;
  }

  const names = wasmBytes ? parseWasmFunctionNames(wasmBytes) : new Map();
  const frames = parseWasmStackFrames(e.stack, names);
  const trapLine = `wasm trap: ${message}`;
  if (frames.length === 0) {
    return trapLine;
  }

  const backtrace = frames.map((frame, i) => {
    const index = String(i).padStart(4, " ");
    const offset = (`0x${frame.offset}`).padStart(8, " ");
    return `${index}: ${offset} - ${frame.name}`;
  });

  return ["error while executing at wasm backtrace:", ...backtrace, trapLine].join(
    "\n",
  );
}
