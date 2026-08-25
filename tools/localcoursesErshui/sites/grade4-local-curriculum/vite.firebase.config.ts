import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "firebase-app"),
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "firebase-dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 4174,
  },
});
