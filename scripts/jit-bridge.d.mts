// Types for jit-bridge.mjs (the file itself is plain node .mjs — the project
// tsconfig is DOM-only, so node imports live outside the checked surface).
import type { Plugin } from "vite-plus";

export declare function jitBridge(): Plugin;
