import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { liveLabPlugin } from "./scripts/live-lab-plugin.mjs";
import { liveMediaPlugin } from "./scripts/live-media-plugin.mjs";
import { imageSearchPlugin } from './scripts/image-search-service.mjs';

export default defineConfig({
  plugins: [react(), liveLabPlugin(), liveMediaPlugin(),imageSearchPlugin()],
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
