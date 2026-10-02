import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "~": new URL("./src", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") } },
  test: { include: ["tests/**/*.test.ts"] },
});
