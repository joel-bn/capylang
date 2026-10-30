<script>
  import Editor from "./lib/Editor.svelte";
  import Console from "./lib/Console.svelte";
  import { SAMPLE_CAPY } from "./lib/sample.capy.js";
  import { compileSource } from "./lib/compile/compileClient.js";
  import { runWasm } from "./lib/runtime/runWasm.js";

  let source = $state(SAMPLE_CAPY);
  let compilerLog = $state("");
  let runtimeLog = $state("");
  let status = $state("Ready");
  let busy = $state(false);

  async function onRun() {
    if (busy) return;
    busy = true;
    runtimeLog = "";
    compilerLog = "Compiling...\n(first run loads capylang.wasm, may take a few seconds)";
    status = "Compiling...";

    try {
      const result = await compileSource(source);
      const parts = [
        `exitCode=${result.exitCode}`,
        `time=${result.ms} ms`,
        result.stdout ? `stdout:\n${result.stdout}` : "stdout: (empty)",
        result.stderr ? `stderr:\n${result.stderr}` : "stderr: (empty)",
      ];

      if (!(result.ok && result.wasm)) {
        compilerLog = parts.join("\n\n");
        runtimeLog = "(skipped, compile failed)";
        status = `Compile failed (exit ${result.exitCode})`;
        return;
      }

      const magic = [...result.wasm.slice(0, 4)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      parts.push(`out.wasm size=${result.wasm.byteLength} magic=${magic}`);
      compilerLog = parts.join("\n\n");
      status = "Running...";
      runtimeLog = "Starting WASI module...";

      const run = await runWasm(result.wasm);
      const runParts = [
        `exitCode=${run.exitCode}`,
        run.stdout ? `stdout:\n${run.stdout}` : "stdout: (empty)",
        run.stderr ? `stderr:\n${run.stderr}` : "stderr: (empty)",
      ];
      runtimeLog = runParts.join("\n\n");
      status = run.ok
        ? `OK (compile ${result.ms} ms, exit ${run.exitCode})`
        : `Runtime exit ${run.exitCode}`;
    } catch (err) {
      const text = err?.stack || String(err);
      if (!compilerLog || compilerLog.startsWith("Compiling")) {
        compilerLog = text;
        status = "Compile error";
      } else {
        runtimeLog = text;
        status = "Runtime error";
      }
    } finally {
      busy = false;
    }
  }
</script>

<main>
  <header>
    <h1>Capy Playground</h1>
    <p class="tagline">Client-only Capylang</p>
    <div class="actions">
      <button type="button" onclick={onRun} disabled={busy}>
        {busy ? "Working..." : "Run"}
      </button>
      <span class="status">{status}</span>
    </div>
  </header>

  <div class="panes">
    <section class="pane">
      <h2>Editor</h2>
      <Editor bind:value={source} />
    </section>
    <section class="pane">
      <h2>Output</h2>
      <Console compiler={compilerLog} runtime={runtimeLog} />
    </section>
  </div>
</main>

<style>
  :global(html, body, #app) {
    height: 100%;
    margin: 0;
  }

  main {
    box-sizing: border-box;
    min-height: 100%;
    padding: 1rem 1.25rem 1.5rem;
    font-family: system-ui, sans-serif;
    color: #1a1a1a;
    background: #f4f4f5;
  }

  header {
    margin-bottom: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
  }

  .tagline {
    margin: 0.25rem 0 0.75rem;
    color: #666;
    font-size: 0.95rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  button {
    font: inherit;
    padding: 0.45rem 1rem;
    border: 1px solid #333;
    border-radius: 4px;
    background: #222;
    color: #fff;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #444;
  }

  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .status {
    font-size: 0.9rem;
    color: #555;
  }

  .panes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    min-height: calc(100vh - 9rem);
  }

  .pane h2 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }

  @media (max-width: 800px) {
    .panes {
      grid-template-columns: 1fr;
    }
  }
</style>
