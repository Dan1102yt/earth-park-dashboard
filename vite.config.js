import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/earth-park-dashboard/",
  build: {
    // Forzar charset UTF-8 en todos los chunks de salida
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: { charset: "utf8" },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
  },
});
