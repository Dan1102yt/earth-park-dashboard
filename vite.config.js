import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "/earth-park-dashboard/",
  // @cerebro → carpeta cerebro/ (conocimiento central que leen los agentes de IA)
  resolve: { alias: { "@cerebro": fileURLToPath(new URL("./cerebro", import.meta.url)) } },
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
