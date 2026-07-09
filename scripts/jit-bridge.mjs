// jit-bridge.mjs — dev-server bridge to the native Publr JIT (E3, css-engine
// thoughts). POST /__jit with a whitespace-separated class list → text/css
// compiled by ../jit/zig-out/bin/jit (same transport as the POC's serve.py).
// Production uses jit_wasm.wasm behind the same CssEngine interface; this
// bridge is the dev/native path. Plain .mjs: the project tsconfig is DOM-only
// (no @types/node) — types ride in jit-bridge.d.ts.
//
// Limitations owned by jit #432: the binary compiles against its COMPTIME
// default theme (site themes don't reach it yet) and reports no drop list
// (unresolved classes are detected editor-side for now).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const JIT = process.env.PUBLR_JIT ?? join(here, "..", "..", "jit", "zig-out", "bin", "jit");
const PREFLIGHT = join(here, "..", "..", "jit", "src", "preflight.css");

export function jitBridge() {
  return {
    name: "publr-jit-bridge",
    configureServer(server) {
      server.middlewares.use("/__jit", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 404;
          res.end();
          return;
        }
        if (!existsSync(JIT)) {
          res.statusCode = 503;
          res.end("jit binary not built — cd ../jit && zig build");
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          void (async () => {
            const manifest = join(
              tmpdir(),
              `pbe-jit-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
            );
            await writeFile(manifest, body);
            const args = [];
            // The demo page ships Tailwind preflight already — callers opt in
            // via ?preflight=1 (published-page previews would want it).
            if (req.url?.includes("preflight=1") && existsSync(PREFLIGHT))
              args.push(`--prepend=${PREFLIGHT}`);
            args.push(manifest);
            const proc = spawn(JIT, args);
            let out = "";
            let err = "";
            proc.stdout.on("data", (c) => (out += c));
            proc.stderr.on("data", (c) => (err += c));
            proc.on("close", (code) => {
              void unlink(manifest).catch(() => {});
              if (code !== 0) {
                res.statusCode = 500;
                res.end(err || "jit failed");
                return;
              }
              res.setHeader("Content-Type", "text/css");
              res.end(out);
            });
          })();
        });
      });
    },
  };
}
