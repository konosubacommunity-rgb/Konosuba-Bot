import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  base: "/manager/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: { port: 3001, host: "0.0.0.0" },
});
