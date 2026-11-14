/**
 * Probe which examples/*.capy files compile (and optionally run) with the current playground stack.
 * Usage: npm run probe
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileCapylang } from "../src/lib/compile/compileCapylang";
import { runWasm } from "../src/lib/runtime/runWasm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");
const wasmPath = join(root, "public", "capylang.wasm");
const examplesDir = join(repo, "examples");

if (!existsSync(wasmPath)) {
  console.error(`missing ${wasmPath}`);
  process.exit(1);
}

const compilerBytes = readFileSync(wasmPath);
const files = readdirSync(examplesDir)
  .filter((f) => f.endsWith(".capy"))
  .sort();

for (const name of files) {
  const source = readFileSync(join(examplesDir, name), "utf8");
  const hasInclude = /^\s*include\b/m.test(source);
  const hasCanvas = /import\s+canvas::/.test(source);
  const hasEnv = /import\s+env::/.test(source);

  let compileOk = false;
  let compileExit: number | null = null;
  let compileErr = "";
  let runOk: boolean | null = null;
  let runExit: number | null = null;
  let runNote = "";

  try {
    const compiled = await compileCapylang({
      source,
      compilerModule: compilerBytes,
    });
    compileOk = compiled.ok;
    compileExit = compiled.exitCode;
    compileErr = (compiled.stderr || "").trim().split("\n").slice(0, 2).join(" | ");

    if (compiled.ok && compiled.wasm) {
      if (hasCanvas || hasEnv) {
        runNote = "skip run (needs canvas/env imports)";
      } else {
        try {
          const run = await runWasm(compiled.wasm);
          runOk = run.ok;
          runExit = run.exitCode;
          if (!run.ok && run.stderr) {
            runNote = run.stderr.trim().split("\n")[0];
          }
        } catch (e) {
          runOk = false;
          runNote = String(e instanceof Error ? e.message : e);
        }
      }
    }
  } catch (e) {
    compileOk = false;
    compileErr = String(e instanceof Error ? e.message : e);
  }

  console.log(
    JSON.stringify({
      name,
      hasInclude,
      hasCanvas,
      hasEnv,
      compileOk,
      compileExit,
      compileErr: compileErr.slice(0, 120),
      runOk,
      runExit,
      runNote: runNote.slice(0, 120),
    }),
  );
}
