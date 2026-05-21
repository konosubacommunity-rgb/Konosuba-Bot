import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT || 3001);
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  root: __dirname,
  build: { outDir: "dist", emptyOutDir: true },
  server:  { port, host: "0.0.0.0", allowedHosts: true },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
