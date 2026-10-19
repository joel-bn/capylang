# Capylang Playground App

Client-only Capylang playground (Svelte 5 + Vite).

## Quick start

```bash
cd playground-app
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173/).

**Phase 1:** Editor (CodeMirror) + Console layout + Run stub. Compile/run not wired yet.

For the Phase 0 compile spike (headless):

```bash
# ensure public/capylang.wasm exists (copy from ../build/capylang.wasm)
npm run spike
```

Browser spike UI (static server from repo root):

```bash
python -m http.server 8765
# http://localhost:8765/playground-app/spike/
```

## Layout

| Path | Role |
|---|---|
| `src/App.svelte` | Layout, Run button, state |
| `src/lib/Editor.svelte` | CodeMirror 6 editor |
| `src/lib/Console.svelte` | Compiler vs Runtime panes |
| `src/lib/sample.capy.js` | Default Capylang sample |
| `spike/` | Phase 0 browser/Node compile proof |
| `public/capylang.wasm` | Compiler asset (gitignored; copy from `build/`) |

## Phases

0. Spike: `capylang.wasm` compiles in JS: done  
1. Svelte skeleton + CodeMirror: current  
2. Compile Worker  
3. easywasm CLI run  
4. Polish + docs  
