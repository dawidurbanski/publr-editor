import { defineConfig } from "vite-plus";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import { jitBridge } from "./scripts/jit-bridge.mjs";

// Dev (`npm run dev`) serves index.html — the demo shell.
// Build (`npm run build`) produces the embeddable single-file library:
//   dist/publr-editor.js       (ES module)
//   dist/publr-editor.iife.js  (script tag → window.Publr.Editor — the same
//                               Publr object the bundled PublrJS runtime claims)
export default defineConfig({
  // Tailwind styles the DEMO SHELL only (index.html + demo.ts) — the library
  // build (src/index.ts) emits no CSS; in production the CMS admin's JIT
  // compiles the same utility vocabulary. jitBridge is the E3 dev transport:
  // POST /__jit → the native jit compiles the canvas's live class universe.
  plugins: [tailwindcss(), jitBridge()],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "Publr.Editor",
      formats: ["es", "iife"],
      fileName: (format) => (format === "iife" ? "publr-editor.iife.js" : "publr-editor.js"),
      // chrome.css (imported by chrome-inline.ts) compiles to this one CSS
      // artifact — batteries-included styling ships NEXT TO the JS, never in
      // it; hosts add a <link> (or import the file) only when they use the
      // default chrome.
      cssFileName: "publr-editor",
    },
  },
  // vp check: full TypeScript type-check (tsgo) alongside the lint rules.
  // The vendored PublrJS runtime is not ours to lint — source of truth is
  // publr-js/src (see scripts/vendor-publr.sh).
  lint: {
    ignorePatterns: ["vendor/**/*.js", "dist/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  // vp test — real Chromium, because upcast/downcast/selection are DOM
  // operations and using the real DOM is the point (project law since the
  // first editor POC).
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
