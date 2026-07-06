# PublrEditor

**Standalone block editor, rebuilt from scratch — incrementally.** The
previous POC lives in `../editor/` and stays as the reference implementation
(its `CONTRACT.md` is still the wire-contract spec); this repo re-grows the
editor one confirmed feature at a time on the architecture settled in
`.claude/thoughts/visual-builder/007`.

## Current scope (steps 0–2a)

Canvas + contenteditable. Two blocks (heading, paragraph). Undo/redo. Block
multiselection + group delete. No sidebar, no tree. What it already proves:

- **HTML wire contract v0** — input and output are annotated HTML
  (`data-pb-*`); un-annotated markup survives as opaque `raw-html` blocks
  (permissive upcast). Authored classes on typed blocks round-trip.
- **Global runtime registration** — `registerBlock(type, def)` is the one
  public path for Publr core, plugins, and the devtools console alike. Hard
  validation per definition; live registry; `unregisterBlock` included.
  The API's global home is **`window.Publr.Editor`** (attached by the entry
  module onto the object PublrJS already claims — no clash-prone globals of
  our own; same target for the IIFE build). Editor instances are the host's
  business; the demo exposes its one as `Publr.editor`.
- **The render is the schema.** A definition is just `{ label, render }`.
  Registration probes `render({})`: the `data-pb-*` carriers in the output
  are the field declarations, and the values read back are the defaults —
  one source of truth, so declared-vs-rendered drift (a round-trip-law bug
  class) is unrepresentable. Conformance rule: render must tolerate absent
  fields. Explicit declarations return only for non-derivables (settings,
  UI metadata like tag options/placeholders) when those features land.
- **Per-block `render(fields)`** in the definition — the renderer is the
  downcast body; the editor dispatches (no monolithic render switch).
- **`commit()` choke point** — every model mutation flows through one
  function. This is the attachment point for undo/redo.
- Enter splits blocks at the caret; **Backspace at a block's start merges it
  into the previous block** (rich→rich keeps markup, rich→text strips,
  text→rich escapes; caret lands at the join; empty blocks just remove;
  before an unmergeable raw block it selects it — the second Backspace
  deletes). Mid-text backspace stays native. Typing syncs DOM → model.
- **Debug tracing** — `?debug` in the demo URL, `createEditor({ debug: true })`,
  or `Publr.editor.debug = true` from the demo console: every commit (with its coalescing
  outcome + stack depths), undo/redo, and load is one `console.log` line
  prefixed `[publr-editor]`. `editor.history` also exposes
  `undoDepth`/`redoDepth` alongside the flags.
- **Undo/redo** — snapshot history `{structuredClone(model), selection}`
  recorded at `commit()`; typing coalesces per (block, field) in a 500ms
  window, structural ops get one entry each; `editor.history` is a PublrJS
  reactive store (`canUndo`/`canRedo` — the demo buttons bind via `effect`);
  native browser undo is disowned (Cmd+Z/Cmd+Shift+Z/Ctrl+Y +
  `beforeinput historyUndo/historyRedo` intercepted); undo re-derives the
  canvas from the restored model and puts the caret back at its exact
  character offset in the right carrier (undo of a split lands on the split
  point; offsets are measured over text content so they survive re-renders,
  clamped when the restored text is shorter).

- **Block multiselection** — a native selection crossing a block boundary
  promotes to whole-block selection (Gutenberg semantics): the contiguous run
  between the endpoints — raw-html blocks in the middle included — highlights
  as blocks (`.pbe-selected`, native text highlight hidden inside), and
  Backspace/Delete removes the run in ONE history entry. `editor.selection`
  is a reactive `{ blocks: [ids] }` store. Because a native drag can never
  leave the contenteditable island it starts in, multiselection is a
  **gesture**: drag from one block into another (the canvas becomes one
  editing host for the duration, so the native drag can span), Shift+click —
  always block-level: it extends a contiguous run from the caret's block or
  the last explicitly selected one, and with no such anchor selects the
  clicked block whole — or **Cmd/Ctrl+click to toggle individual blocks —
  non-contiguous selections are fully supported** (the id list is the source
  of truth; delete works on any subset). Keyboard multiselect (Shift+arrows)
  is a later, deliberate feature. `editor.destroy()` detaches the
  document-level listeners.
- **Floating block toolbar (POC chrome)** — hovers above the caret's block or
  a single selected block: move up/down (`editor.moveBlock`, caret follows,
  undoable), bold/italic via the **in-house formatting engine**
  (`src/format.ts` — no execCommand: rich content flattens to per-character
  mark sets + opaque atoms, toggling is set arithmetic, serialization
  re-emits canonical nested HTML; one undo entry, selection restored over
  the span, `editor.formatState()` drives button highlights), and text alignment
  written as **authored classes** (`text-left/center/right` — JIT-compiled in
  production, stubbed in demo CSS) so it rides the wire contract with zero
  new vocabulary. Built entirely in the demo shell on public editor APIs
  (`selection.active`, `moveBlock`, `setClasses`, `getBlock`) — the layering
  proof that hosts and plugins can build chrome. Drag-and-drop deliberately
  deferred.
- **Slash command on the PublrJS dropdown contract** — empty default blocks
  show a ghost prompt ("Type / to choose a block", editor-stamped, never
  serialized); "/" opens a dropdown that is nothing but MARKUP
  (`data-p-store="local:dropdown"` + `data-p-on/-show/-bind/-portal` +
  `data-publr-part`) wired by core `publr.js`, with a ~70-line `dropdown`
  store factory registered by the demo (portal, positioning via
  `publr-position.js`, focus nav, first-letter type-ahead, dismiss). No
  design-system assets. Picking calls `editor.replaceBlock(id, type)` (one
  undo entry). Runtime gotchas that cost time: `data-p-show` toggles the
  `hidden` CLASS; `data-p-bind` writes boolean true as an EMPTY attribute
  value (don't read aria-expanded to test openness). Open question flagged:
  core ships the `local:` factory mechanism but no built-in factories —
  standard component stores may belong in publr-js itself.
- **Raw blocks are opaque, not untouchable** — clicking a raw-html block
  selects it as a block (its only interaction surface: no carriers, nothing
  to caret into); Backspace/Delete removes it, Escape or clicking editable
  content deselects, and a real block-spanning selection overrides it.
  Content-level editing of raw blocks stays off-limits by design.

## Layout

```
src/index.ts      public entry — re-exports only
src/carriers.ts   wire-contract primitives: carrier vocabulary, escaping, scoping
src/registry.ts   global block registry + the probe (render({}) → derived fields)
src/cast.ts       upcast / downcast — annotated HTML ⇄ block model
src/format.ts     inline formatting engine — per-char mark sets + atoms, no execCommand
src/history.ts    snapshot stacks + coalescing + reactive flags (model-agnostic)
src/selection.ts  block multiselection — selectionchange mirror + reactive ids
src/editor.ts     createEditor — canvas, events, the commit() choke point
src/demo.ts       dev demo shell (registers the core blocks via the public API)
vendor/publr/     vendored PublrJS .js — DO NOT EDIT (../scripts/vendor-publr.sh);
                  the *.d.ts files beside them are editor-local typings, not vendored
tests/            vp test — Vitest browser mode, real Chromium
```

## Run

```bash
npm install
npx playwright install chromium-headless-shell   # once, for vp test
npm run dev      # vp dev — demo shell at the printed URL
npm run test     # vp test — Vitest browser mode (real Chromium)
npm run build    # vp build — dist/publr-editor.js (ESM) + dist/publr-editor.iife.js (window.Publr.Editor)
```

No Python anywhere. **Source is strict TypeScript** — `npm run check`
(`vp check`) runs format + lint + full type-check (enabled via
`lint.options.typeCheck` in `vite.config.ts`); the vendored runtime is typed
by editor-local `vendor/publr/*.d.ts` declarations. Toolchain is **Vite+**
(`vp`, v0.2.x beta, MIT) — the unified Vite/Vitest/Oxlint/Oxfmt CLI from
VoidZero. One devDependency family, one `vite.config.ts`; `vp test` (Vitest
browser mode) is the intended home for the contract test suite as features
land. `npm run lint` / `npm run fmt` are wired and free.

## Constraints

- **One easily embeddable JS file** is the product (`npm run build`).
- **PublrJS is the only runtime dependency** (vendored via
  `../scripts/vendor-publr.sh` — never edit `vendor/publr/`), used for chrome
  state only (the history store); the canvas stays an uncontrolled
  contenteditable surface, never reactively rendered. KNOWN ISSUE for the
  packaging step: vendored publr.js auto-hydrates on import and claims
  `window.Publr` — bundle-vs-host runtime coexistence must be settled before
  embedding the editor in a page that runs its own PublrJS.
- **No Zig/ZSX required** — ZSX block components are Publr-side sugar that
  compiles down to this contract + API.
- **Round-trip law** — `upcast(downcast(model))` must deep-equal the model.
  Every feature added must keep it true.

## Roadmap (one at a time, each confirmed before the next)

1. ~~**Undo/redo**~~ — done (#260): snapshot history on `commit()`, reactive
   store, coalescing, selection restore, native undo disowned; 18 browser
   tests.
2. Selection + block ops — **2a done (#266):** multiselection (drag / shift /
   cmd-click) + group delete + raw-block select; **toolbar POC done (#274):**
   move arrows, bold/italic, align-as-classes; remaining: duplicate, keyboard
   multiselect, drag-and-drop
3. Inserter — **slash command done (#281)**, **appender done (#284):**
   click below content appends/refocuses an empty default block (ghost +
   slash compose); remaining: explicit + button chrome
4. More core blocks + settings islands (`data-pb-settings`)
5. Slots & nesting (`data-pb-slot`)
6. Authored-classes baseline subtraction + WASM JIT style slot
7. Editor chrome on PublrJS (sidebar, tree, lenses)
8. Patterns, interactions (`data-p-*`), per-instance `allowedBlocks`
