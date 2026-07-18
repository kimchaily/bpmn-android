import { defineConfig } from "vite";

// Capacitor loads the built assets from a file:// / https-scheme WebView, so
// use relative asset URLs (base: "./") rather than absolute ones.
export default defineConfig({
  base: "./",
  build: {
    target: "es2019",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
