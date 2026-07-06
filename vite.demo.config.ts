import { resolve } from "node:path";
import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";

// Builds the DEMO SHELL (index.html "chrome" + fields.html "inline") as a
// deployable static site — separate from vite.config.ts's library build,
// which bundles dist/publr-editor.js for consumers and never touches HTML.
// Used by `npm run build:demo` / Vercel (see vercel.json).
export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "dist-demo",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        fields: resolve(__dirname, "fields.html"),
      },
    },
  },
});
