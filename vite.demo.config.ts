import { defineConfig } from "vite-plus";
import tailwindcss from "@tailwindcss/vite";

// Builds the DEMO SHELL (index.html "chrome" + fields.html "inline") as a
// deployable static site — separate from vite.config.ts's library build,
// which bundles dist/publr-editor.js for consumers and never touches HTML.
// Used by `npm run build:demo` / Vercel (see vercel.json).
// import.meta.url instead of node:path — the config type-checks with the
// project's DOM-only tsconfig (no @types/node), same as vite.config.ts.
export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "dist-demo",
    rollupOptions: {
      input: {
        main: new URL("index.html", import.meta.url).pathname,
        fields: new URL("fields.html", import.meta.url).pathname,
      },
    },
  },
});
