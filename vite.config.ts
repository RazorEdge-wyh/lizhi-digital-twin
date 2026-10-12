import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the bundle works on GitHub Pages project sites
// (https://<user>.github.io/<repo>/) and on a user/organization root site.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    target: "es2020",
    sourcemap: false,
  },
});
