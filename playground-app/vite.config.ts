import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [svelte()],
  server: {
    // Allow `?raw` imports of repo-root `lib/*.capy` stdlib sources.
    fs: { allow: [root, join(root, "..")] },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{js,ts}"],
  },
});
