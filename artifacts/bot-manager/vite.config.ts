import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const PORT = parseInt(process.env.PORT || "24048", 10);
const BASE = process.env.BASE_PATH || "/manager/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: PORT,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port: PORT,
    host: "0.0.0.0",
  },
});
