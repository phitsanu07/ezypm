/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/types", replacement: resolve(__dirname, "src/types/index.ts") },
      { find: /^@\/types\/(.*)$/, replacement: resolve(__dirname, "src/types/$1") },
      { find: /^@\/frontend\/(.*)$/, replacement: resolve(__dirname, "src/frontend/$1") },
      { find: /^@\/api\/(.*)$/, replacement: resolve(__dirname, "src/api/$1") },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.test.tsx", "tests/e2e/**"],
    setupFiles: ["tests/setup.ts"],
  },
});
