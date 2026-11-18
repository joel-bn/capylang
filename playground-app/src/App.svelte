<script lang="ts">
  import { onMount } from "svelte";
  import Editor from "./lib/Editor.svelte";
  import Console from "./lib/Console.svelte";
  import { SAMPLE_CAPY } from "./lib/sample.capy";
  import { compileSource, cancelCompile } from "./lib/compile/compileClient";
  import { runWasmAsync, cancelRun } from "./lib/runtime/runClient";

  type Phase = "idle" | "compile" | "run";

  const OUTPUT_MIN = 15;
  const OUTPUT_MAX = 70;
  const SIDE_BY_SIDE_MQ = "(min-width: 1200px)";

  let source = $state(SAMPLE_CAPY);
  let stdoutLog = $state("");
  let compilerLog = $state("");
  let runtimeLog = $state("");
  let compileStatus = $state("");
  let runtimeStatus = $state("");
  let busy = $state(false);
  let busyLabel = $state("Run");
  let phase = $state<Phase>("idle");
  let outputOpen = $state(true);
  let outputSharePercent = $state(32);
  let sideBySide = $state(false);
  let workspaceEl: HTMLDivElement | undefined = $state();
  let resizing = $state(false);

  onMount(() => {
    const mq = window.matchMedia(SIDE_BY_SIDE_MQ);
    const sync = () => {
      sideBySide = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  });

  function isAbort(err: unknown) {
    return err instanceof DOMException
      ? err.name === "AbortError"
      : typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name?: string }).name === "AbortError";
  }

  function formatCaught(err: unknown): string {
    const e = err as { name?: string; message?: string };
    const name = e?.name || "Error";
    const message = (e?.message || String(err)).trim() || name;
    return `[${name}] ${message}`;
  }

  function clearOutput() {
    stdoutLog = "";
    compilerLog = "";
    runtimeLog = "";
    compileStatus = "";
    runtimeStatus = "";
  }

  const statusText = $derived(
    [
      compileStatus ? `compile: ${compileStatus}` : "",
      runtimeStatus ? `runtime: ${runtimeStatus}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  function closeOutput() {
    outputOpen = false;
  }

  function openOutput() {
    outputOpen = true;
  }

  function clampoutputSharePercent(value: number) {
    return Math.min(OUTPUT_MAX, Math.max(OUTPUT_MIN, value));
  }

  function onResizePointerDown(event: PointerEvent) {
    if (!workspaceEl || event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    resizing = true;

    const startPos = sideBySide ? event.clientX : event.clientY;
    const startPct = outputSharePercent;
    const total = sideBySide
      ? workspaceEl.getBoundingClientRect().width
      : workspaceEl.getBoundingClientRect().height;

    function onMove(ev: PointerEvent) {
      if (total <= 0) return;
      const pos = sideBySide ? ev.clientX : ev.clientY;
      // Dragging the divider toward the editor grows output.
      outputSharePercent = clampoutputSharePercent(startPct + ((startPos - pos) / total) * 100);
    }

    function onUp(ev: PointerEvent) {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      resizing = false;
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function onStop() {
    if (!busy) return;
    const stoppedPhase = phase;
    cancelCompile();
    cancelRun();
    busy = false;
    busyLabel = "Run";
    phase = "idle";
    outputOpen = true;
    if (stoppedPhase === "compile" || compilerLog.startsWith("Compiling")) {
      compileStatus = "cancelled";
      runtimeStatus = "";
      compilerLog = "(cancelled)";
      runtimeLog = "";
      stdoutLog = "";
    } else {
      runtimeStatus = "cancelled";
      runtimeLog = runtimeLog || "(cancelled)";
    }
  }

  async function onRun() {
    if (busy) return;
    busy = true;
    busyLabel = "Compiling...";
    phase = "compile";
    outputOpen = true;
    clearOutput();
    compileStatus = "…";
    compilerLog = "Compiling…\n(first run loads capylang.wasm, may take a few seconds)";

    try {
      const result = await compileSource(source);
      if (!busy) return;

      if (!(result.ok && result.wasm)) {
        const bits = [
          result.stderr.trim() || "(no compiler stderr)",
          result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
        ].filter(Boolean);
        compilerLog = bits.join("\n\n");
        stdoutLog = "";
        runtimeLog = "";
        compileStatus = `failed (exit ${result.exitCode}, ${result.ms} ms)`;
        runtimeStatus = "skipped";
        return;
      }

      compileStatus = `OK (${result.ms} ms)`;
      compilerLog = result.stderr.trim();
      busyLabel = "Running...";
      phase = "run";
      runtimeStatus = "…";
      runtimeLog = "";

      const run = await runWasmAsync(result.wasm);
      if (!busy) return;

      const out = run.stdout.trimEnd();
      const err = run.stderr.trim();

      if (run.ok) {
        stdoutLog = out.length > 0 ? out : "(no output)";
        runtimeLog = "";
        runtimeStatus = `OK (exit ${run.exitCode})`;
      } else {
        stdoutLog = out;
        runtimeLog = err || `exit ${run.exitCode}`;
        runtimeStatus = err.includes("trap:")
          ? "trap"
          : `failed (exit ${run.exitCode})`;
      }
    } catch (err) {
      if (isAbort(err) || !busy) return;
      const text = formatCaught(err);
      if (phase === "compile") {
        compilerLog = text;
        stdoutLog = "";
        runtimeLog = "";
        compileStatus = "error";
        runtimeStatus = "skipped";
      } else {
        runtimeLog = text;
        runtimeStatus = "error";
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
    <div class="brand">Capy-Playground</div>
    <div class="actions">
      <button type="button" class="run" onclick={onRun} disabled={busy}>
        {busyLabel}
      </button>
      <button type="button" class="stop" onclick={onStop} disabled={!busy}>
        Stop
      </button>
      {#if !outputOpen}
        <button type="button" class="show-output" onclick={openOutput}>
          Show Output
        </button>
      {/if}
    </div>
  </header>

  <div
    class="workspace"
    class:output-open={outputOpen}
    class:side-by-side={sideBySide && outputOpen}
    class:resizing
    bind:this={workspaceEl}
    style="--output-pct: {outputSharePercent}%"
  >
    <section class="editor-pane" aria-label="Editor">
      <Editor bind:value={source} />
    </section>

    {#if outputOpen}
      <div
        class="resize-handle"
        role="separator"
        aria-orientation={sideBySide ? "vertical" : "horizontal"}
        aria-label="Resize output"
        aria-valuemin={OUTPUT_MIN}
        aria-valuemax={OUTPUT_MAX}
        aria-valuenow={Math.round(outputSharePercent)}
        onpointerdown={onResizePointerDown}
      ></div>
      <section class="output-pane" aria-label="Output">
        <Console
          status={statusText}
          stdout={stdoutLog}
          compiler={compilerLog}
          runtime={runtimeLog}
          onClose={closeOutput}
        />
      </section>
    {/if}
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
    font-family: system-ui, sans-serif;
    color: #1a1a1a;
    background: #f4f4f5;
    overflow: hidden;
  }

  header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 2.75rem;
    padding: 0.4rem 0.85rem;
    border-bottom: 1px solid #d4d4d8;
    background: #fff;
  }

  .brand {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  button {
    font: inherit;
    padding: 0.35rem 0.85rem;
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

  button.run {
    font-weight: 600;
  }

  button.stop,
  button.show-output {
    background: #fff;
    color: #222;
    border-color: #888;
  }

  button.stop:hover:not(:disabled),
  button.show-output:hover:not(:disabled) {
    background: #eee;
  }

  .show-output {
    margin-left: auto;
  }

  .workspace {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  .workspace.output-open {
    grid-template-rows: 1fr 6px minmax(6rem, var(--output-pct, 32%));
  }

  .workspace.output-open.side-by-side {
    grid-template-columns: 1fr 6px minmax(14rem, var(--output-pct, 32%));
    grid-template-rows: 1fr;
  }

  .workspace.resizing {
    user-select: none;
    cursor: inherit;
  }

  .editor-pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .resize-handle {
    touch-action: none;
    background: #d4d4d8;
    transition: background 0.12s ease;
  }

  .workspace.output-open:not(.side-by-side) .resize-handle {
    cursor: row-resize;
  }

  .workspace.output-open.side-by-side .resize-handle {
    cursor: col-resize;
  }

  .resize-handle:hover,
  .workspace.resizing .resize-handle {
    background: #a1a1aa;
  }

  .output-pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }
</style>
