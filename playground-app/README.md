# Capylang Playground App

New browser playground (Svelte planned). Phase 0 is a compile spike only.

## Phase 0 – Browser / Node compile spike

Proves that `capylang.wasm` can compile Capylang source via WASI in JS (easywasm + in-memory FS).

### Prerequisites

- Copy/build `build/capylang.wasm` into `public/capylang.wasm` (already done for the spike if present).
- Node.js 18+ (for headless check) or any static file server (for the HTML UI).

### Headless test

```bash
node playground-app/spike/node_spike.mjs
```

Expect: `OK … magic=0061736d` and `spike/spike-browser-out.wasm`.

### Browser UI

From the **repository root** (so URLs resolve):

```bash
python -m http.server 8765
```

Open: http://localhost:8765/playground-app/spike/

Click **Compile sample**.

### Layout

- `public/capylang.wasm` – compiler asset
- `spike/` – MemoryFS, easywasm copy, compile helper, HTML UI, Node runner
