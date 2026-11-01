import { runWasm } from "./runWasm.js";

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "run") return;

  const { id, wasm } = msg;
  try {
    const result = await runWasm(wasm);
    self.postMessage({
      type: "result",
      id,
      ok: result.ok,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (err) {
    const name = err?.name || "Error";
    const message = err?.message || String(err);
    const stack = err?.stack || "";
    self.postMessage({
      type: "result",
      id,
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: `[${name}] ${message}\n${stack}`,
    });
  }
};
