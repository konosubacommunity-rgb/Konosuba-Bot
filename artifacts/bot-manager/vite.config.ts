import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// VITE_BASE_PATH controls the base URL for asset references.
// - Separate static site on Render: leave unset (defaults to "/")
// - Single Express service (bot-manager served at /manager/): set VITE_BASE_PATH=/manager/
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  base: basePath,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: { port: 3001, host: "0.0.0.0" },
});
