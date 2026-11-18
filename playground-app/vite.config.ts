import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [svelte()],
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.{js,ts}"],
  },
});
