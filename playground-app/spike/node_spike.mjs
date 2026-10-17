/**
 * Headless Phase-0 check (Node 18+): compile Capylang via capylang.wasm + easywasm.
 * Usage: node playground-app/spike/node_spike.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileCapylang } from "./compile_spike.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(__dirname, "..", "public", "capylang.wasm");

const bytes = readFileSync(wasmPath);
console.log(`compiler bytes: ${bytes.byteLength}`);

const t0 = performance.now();
const result = await compileCapylang({ compilerModule: bytes });
const ms = Math.round(performance.now() - t0);

console.log(`exitCode=${result.exitCode}`);
console.log(`stdout:\n${result.stdout || "(empty)"}`);
console.log(`stderr:\n${result.stderr || "(empty)"}`);

if (result.ok) {
  const outPath = join(__dirname, "spike-browser-out.wasm");
  writeFileSync(outPath, result.wasm);
  const magic = Buffer.from(result.wasm.slice(0, 4)).toString("hex");
  console.log(`OK ${ms}ms size=${result.wasm.byteLength} magic=${magic} wrote ${outPath}`);
  process.exit(0);
}

console.error(`FAIL ${ms}ms`);
process.exit(1);
