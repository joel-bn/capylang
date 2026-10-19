<script>
  /** @type {{ compiler?: string, runtime?: string }} */
  let { compiler = "", runtime = "" } = $props();
</script>

<div class="console">
  <section>
    <h3>Compiler</h3>
    <pre class="compiler">{compiler || "(idle)"}</pre>
  </section>
  <section>
    <h3>Runtime</h3>
    <pre class="runtime">{runtime || "(idle)"}</pre>
  </section>
</div>

<style>
  .console {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 0.75rem;
    height: 100%;
    min-height: 280px;
  }

  section {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  h3 {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
  }

  pre {
    flex: 1;
    margin: 0;
    padding: 0.75rem;
    overflow: auto;
    border: 1px solid #ccc;
    background: #111;
    color: #e8e8e8;
    font-size: 13px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre-wrap;
  }
</style>
