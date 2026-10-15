import { defineConfig } from "vite";
import {assignmentLabPlugin} from "./scripts/assignment-lab-plugin.mjs";
import react from "@vitejs/plugin-react";
import { liveLabPlugin } from "./scripts/live-lab-plugin.mjs";
import { liveMediaPlugin } from "./scripts/live-media-plugin.mjs";
import { imageSearchPlugin } from './scripts/image-search-service.mjs';

export default defineConfig({
  plugins: [react(),assignmentLabPlugin(), liveLabPlugin(), liveMediaPlugin(),imageSearchPlugin()],
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
