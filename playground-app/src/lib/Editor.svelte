<script>
  import { onMount, onDestroy } from "svelte";
  import { EditorView, basicSetup } from "codemirror";
  import { EditorState } from "@codemirror/state";
  import { capylang } from "./editor/capylangLanguage.js";

  /** @type {{ value?: string, onChange?: (text: string) => void }} */
  let { value = $bindable(""), onChange = undefined } = $props();

  /** @type {HTMLDivElement | undefined} */
  let host;
  /** @type {EditorView | undefined} */
  let view;

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        capylang(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            value = next;
            onChange?.(next);
          }
        }),
      ],
    });
    view = new EditorView({ state, parent: host });
  });

  onDestroy(() => {
    view?.destroy();
  });

  export function getValue() {
    return view ? view.state.doc.toString() : value;
  }

  /** @param {string} text */
  export function setValue(text) {
    if (!view) {
      value = text;
      return;
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }
</script>

<div class="editor-host" bind:this={host}></div>

<style>
  .editor-host {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #ccc;
    background: #fafafa;
  }

  .editor-host :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
  }

  .editor-host :global(.cm-scroller) {
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
</style>
