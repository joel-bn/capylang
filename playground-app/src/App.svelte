<script>
  import Editor from "./lib/Editor.svelte";
  import Console from "./lib/Console.svelte";
  import { SAMPLE_CAPY } from "./lib/sample.capy.js";
  import { compileSource, cancelCompile } from "./lib/compile/compileClient.js";
  import { runWasmAsync, cancelRun } from "./lib/runtime/runClient.js";

  let source = $state(SAMPLE_CAPY);
  let compilerLog = $state("");
  let runtimeLog = $state("");
  let status = $state("Ready");
  let busy = $state(false);
  let busyLabel = $state("Run");
  let phase = $state(/** @type {"idle" | "compile" | "run"} */ ("idle"));

  function isAbort(err) {
    return err?.name === "AbortError";
  }

  function onStop() {
    if (!busy) return;
    cancelCompile();
    cancelRun();
    busy = false;
    busyLabel = "Run";
    phase = "idle";
    status = "Stopped";
    if (compilerLog.startsWith("Compiling")) {
      compilerLog = "(cancelled)";
    }
    if (runtimeLog === "Starting WASI module..." || runtimeLog === "") {
      runtimeLog = "(cancelled)";
    }
  }

  async function onRun() {
    if (busy) return;
    busy = true;
    busyLabel = "Compiling...";
    phase = "compile";
    runtimeLog = "";
    compilerLog = "Compiling...\n(first run loads capylang.wasm, may take a few seconds)";
    status = "Compiling...";

    try {
      const result = await compileSource(source);
      if (!busy) return;

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
      busyLabel = "Running...";
      phase = "run";
      status = "Running...";
      runtimeLog = "Starting WASI module...";

      const run = await runWasmAsync(result.wasm);
      if (!busy) return;

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
      if (isAbort(err) || !busy) return;
      const text = err?.stack || String(err);
      if (phase === "compile") {
        compilerLog = text;
        status = "Compile error";
      } else {
        runtimeLog = text;
        status = "Runtime error";
      }
    } finally {
      if (busy) {
        busy = false;
        busyLabel = "Run";
        phase = "idle";
      }
    }
  }
</script>

<main>
  <header>
    <h1>Capy Playground</h1>
    <p class="tagline">Client-only Capylang</p>
    <div class="actions">
      <button type="button" onclick={onRun} disabled={busy}>
        {busyLabel}
      </button>
      <button type="button" class="stop" onclick={onStop} disabled={!busy}>
        Stop
      </button>
      <span class="status">{status}</span>
    </div>
  </header>

  <div class="panes">
    <section class="pane">
      <h2>Editor</h2>
      <div class="pane-body">
        <Editor bind:value={source} />
      </div>
    </section>
    <section class="pane">
      <h2>Output</h2>
      <div class="pane-body">
        <Console compiler={compilerLog} runtime={runtimeLog} />
      </div>
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
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem 1.25rem 1.5rem;
    font-family: system-ui, sans-serif;
    color: #1a1a1a;
    background: #f4f4f5;
    overflow: hidden;
  }

  header {
    flex: 0 0 auto;
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
    cursor: not-allowed;
  }

  button.stop {
    background: #fff;
    color: #222;
    border-color: #888;
  }

  button.stop:hover:not(:disabled) {
    background: #eee;
  }

  .status {
    font-size: 0.9rem;
    color: #555;
  }

  .panes {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .pane h2 {
    flex: 0 0 auto;
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }

  .pane-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 800px) {
    .panes {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
    }
  }
</style>
