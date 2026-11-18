<script lang="ts">
  let {
    status = "",
    stdout = "",
    compiler = "",
    runtime = "",
    onClose = undefined,
  }: {
    status?: string;
    stdout?: string;
    compiler?: string;
    runtime?: string;
    onClose?: () => void;
  } = $props();

  const hasStatus = $derived(status.trim().length > 0);
  const hasStdout = $derived(stdout.trim().length > 0);
  const hasCompiler = $derived(compiler.trim().length > 0);
  const hasRuntime = $derived(runtime.trim().length > 0);
  const empty = $derived(!hasStatus && !hasStdout && !hasCompiler && !hasRuntime);
</script>

<div class="console">
  <div class="console-header">
    <h2>Output</h2>
    {#if onClose}
      <button type="button" class="close" onclick={onClose} title="Close output">
        Close
      </button>
    {/if}
  </div>
  <div class="console-body">
    {#if empty}
      <p class="hint">Run to compile and execute</p>
    {:else}
      {#if hasStatus}
        <section>
          <h3>Status</h3>
          <pre>{status}</pre>
        </section>
      {/if}
      {#if hasStdout}
        <section>
          <h3>Stdout</h3>
          <pre>{stdout}</pre>
        </section>
      {/if}
      {#if hasCompiler}
        <section>
          <h3>Compiler</h3>
          <pre>{compiler}</pre>
        </section>
      {/if}
      {#if hasRuntime}
        <section>
          <h3>Runtime</h3>
          <pre>{runtime}</pre>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .console {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: #e4e4e7;
    color: #18181b;
  }

  .console-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid #d4d4d8;
    background: #d4d4d8;
  }

  h2 {
    margin: 0;
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #52525b;
  }

  .close {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.2rem 0.55rem;
    border: 1px solid #a1a1aa;
    border-radius: 3px;
    background: #f4f4f5;
    color: #3f3f46;
    cursor: pointer;
  }

  .close:hover {
    background: #fff;
    border-color: #71717a;
  }

  .console-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0.65rem 0.75rem 0.85rem;
  }

  .hint {
    margin: 0;
    color: #71717a;
    font-size: 0.9rem;
  }

  section {
    margin: 0 0 0.85rem;
  }

  section:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #71717a;
  }

  pre {
    margin: 0;
    padding: 0;
    overflow: visible;
    background: transparent;
    border: none;
    color: #18181b;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
