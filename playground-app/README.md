# Capylang Playground App

Client-only Capylang playground (Svelte 5 + Vite + TypeScript).

## Quick start

```bash
cd playground-app
# once: copy ../build/capylang.wasm to public/capylang.wasm
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173/). Click **Run**.

```bash
npm test         # Vitest; needs public/capylang.wasm
npm run test:watch
npm run check
npm run probe    # scan ../examples/*.capy
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
| `src/lib/editor/capylangLanguage.ts` | Capylang highlighting (keywords from lexer grammar) |
| `src/lib/Console.svelte` | output (Stdout / Compiler / Runtime sections) |
| `src/lib/sample.capy.ts` | Default hello sample |
| `src/lib/compile/` | Worker + MemoryFS + compiler |
| `src/lib/runtime/` | WASI CLI run, trap formatting, name-section lookup |
| `src/lib/wasiHelpers.ts` | Shared WASI import binding / exit-code extract |
| `tests/` | Node tests |
| `spike/` | Early compile spike |
| `public/capylang.wasm` | Compiler asset (gitignored) |

## GitHub Pages

CI (`.github/workflows/docs.yml`) builds MkDocs plus this app and deploys:

- Docs: `https://<user>.github.io/<repo>/`
- Playground: `https://<user>.github.io/<repo>/playground/`

Local production build with the same base (repo name `wipro` example):

```bash
# needs public/capylang.wasm
VITE_BASE=/wipro/playground/ npm run build
npm run preview
```

Deploy happens on push to `main` (and via `workflow_dispatch`).

