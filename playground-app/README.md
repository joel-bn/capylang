# Capylang Playground App

Client-only Capylang playground (Svelte 5 + Vite).

## Quick start

```bash
cd playground-app
# once: copy ../build/capylang.wasm to public/capylang.wasm
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173/). Click **Run**.

```bash
npm test   # needs public/capylang.wasm
```

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
| `src/App.svelte` | Layout, Run flow |
| `src/lib/Editor.svelte` | CodeMirror 6 + Capylang StreamLanguage |
| `src/lib/editor/capylangLanguage.js` | Capylang highlighting (keywords from lexer grammar) |
| `src/lib/Console.svelte` | Compiler vs Runtime panes |
| `src/lib/sample.capy.js` | Default hello sample |
| `src/lib/compile/` | Worker + MemoryFS + compiler |
| `src/lib/runtime/runWasm.js` | WASI CLI run |
| `tests/` | Node tests |
| `spike/` | Early compile spike |
| `public/capylang.wasm` | Compiler asset (gitignored) |

## MVP status

0. Spike: `capylang.wasm` compiles in JS: done  
1. Svelte skeleton + CodeMirror: done  
2. Compile Worker: done  
3. easywasm CLI run: done  
4. Polish: done
