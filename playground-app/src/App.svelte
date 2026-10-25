<script>
  import Editor from "./lib/Editor.svelte";
  import Console from "./lib/Console.svelte";
  import { SAMPLE_CAPY } from "./lib/sample.capy.js";
  import { compileSource } from "./lib/compile/compileClient.js";

  let source = $state(SAMPLE_CAPY);
  let compilerLog = $state("");
  let runtimeLog = $state("");
  let status = $state("Ready");
  let busy = $state(false);
  /** @type {Uint8Array | null} */
  let lastWasm = $state(null);

  async function onRun() {
    if (busy) return;
    busy = true;
    lastWasm = null;
    runtimeLog = "(Phase 3: run not wired yet)";
    compilerLog = "Compiling…\n(first run loads capylang.wasm, may take a few seconds)";
    status = "Compiling…";

    try {
      const result = await compileSource(source);
      const parts = [
        `exitCode=${result.exitCode}`,
        `time=${result.ms} ms`,
        result.stdout ? `stdout:\n${result.stdout}` : "stdout: (empty)",
        result.stderr ? `stderr:\n${result.stderr}` : "stderr: (empty)",
      ];

      if (result.ok && result.wasm) {
        lastWasm = result.wasm;
        const magic = [...result.wasm.slice(0, 4)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        parts.push(`out.wasm size=${result.wasm.byteLength} magic=${magic}`);
        compilerLog = parts.join("\n\n");
        status = `Compile OK (${result.wasm.byteLength} bytes, ${result.ms} ms)`;
      } else {
        compilerLog = parts.join("\n\n");
        status = `Compile failed (exit ${result.exitCode})`;
      }
    } catch (err) {
      compilerLog = String(err && err.stack ? err.stack : err);
      status = "Compile error";
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
        {busy ? "Compiling…" : "Run"}
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
