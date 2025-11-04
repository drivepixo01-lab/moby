import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Se quiser manter os plugins do Mocha, mantenha a import abaixo.
// Caso não esteja usando, pode remover.
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
  plugins: [react(), ...(mochaPlugins ? mochaPlugins() : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  server: {
    allowedHosts: true,
  },
});
