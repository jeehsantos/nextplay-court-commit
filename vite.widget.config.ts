import { defineConfig } from "vite";
import path from "path";

// Build: npx vite build --config vite.widget.config.ts
// Outputs: public/widget/v1/widget.js (single IIFE bundle, no externals)
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "widget-src/main.ts"),
      name: "NextPlayWidget",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    outDir: "public/widget/v1",
    emptyOutDir: true,
    minify: "terser",
    sourcemap: false,
    rollupOptions: {
      output: { extend: true },
    },
  },
});
