// Demo shell. Even "core" blocks go through the public registration API —
// there is no privileged path: Publr core, plugins, and the devtools console
// all call registerBlock the same way. A definition is just { label, render }:
// fields (names, kinds, defaults) are derived from the data-pb-* carriers the
// render emits. Try it live:
//
//   Publr.Editor.registerBlock("marquee", {
//     label: "Marquee",
//     render: (f) => `<marquee data-pb-block="marquee" data-pb-text="text">${f.text ?? "hi"}</marquee>`,
//   });
//
// The harness itself is ONE PublrJS island (local:chrome, wired declaratively
// in index.html via data-p-*). The imperative opt-out is exactly the canvas:
// the editor owns its contenteditable DOM, and this store's sync functions
// MEASURE canvas geometry into state — everything the user sees updates
// through bindings, never through direct DOM writes.

import * as PublrEditor from "./index";
import { Publr, effect } from "../vendor/publr/publr.js";
import { position } from "../vendor/publr/publr-position.js";
import "./styles.css";

const {
  registerBlock,
  createEditor,
  attachInlineChrome,
  escHtml,
  blockTypes,
  getBlockType,
  locateBlock,
  pathToBlock,
  flattenBlocks,
} = PublrEditor;
type Block = PublrEditor.Block;
// The editor API is already at window.Publr.Editor (attached by the entry
// module — one global namespace, owned by PublrJS, which is a dependency
// anyway). The demo only adds its instance below as Publr.editor.

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

registerBlock("heading", {
  label: "Heading",
  category: "Text",
  placeholder: "Heading", // ghost prompt while empty (editor-UI metadata)
  // The render is the schema: probing this with {} derives fields
  // text (default "") and level (tag, default "h2" — the fallback below).
  render(fields) {
    const tag = fields.level && HEADING_TAGS.includes(fields.level) ? fields.level : "h2";
    return `<${tag} data-pb-block="heading" data-pb-tag="level" data-pb-text="text">${escHtml(fields.text ?? "")}</${tag}>`;
  },
});

registerBlock("paragraph", {
  label: "Paragraph",
  category: "Text",
  render(fields) {
    return `<p data-pb-block="paragraph" data-pb-rich="body">${fields.body ?? ""}</p>`;
  },
});

registerBlock("quote", {
  label: "Quote",
  category: "Text",
  placeholder: "Quote",
  render(fields) {
    return `<blockquote data-pb-block="quote" data-pb-rich="body">${fields.body ?? ""}</blockquote>`;
  },
});

registerBlock("code", {
  label: "Code",
  category: "Text",
  placeholder: "Write code…",
  render(fields) {
    return `<pre data-pb-block="code" data-pb-text="code">${escHtml(fields.code ?? "")}</pre>`;
  },
});

// The first container block: accepts any blocks, same as the root canvas.
// The root IS the children slot — inner blocks are appended straight into it.
registerBlock("group", {
  label: "Group",
  category: "Design",
  render() {
    return `<div data-pb-block="group" data-pb-children></div>`;
  },
});

const BADGES: Record<string, string> = {
  paragraph: "¶",
  heading: "H",
  quote: "❝",
  code: "</>",
  group: "▣",
};

// Dataset payload handed to actions by data-p-on ({ ...el.dataset }).
type Dataset = { [key: string]: string | undefined };

interface BlockItem {
  type: string;
  label: string;
  icon: string;
}

/** One outline row: a heading anywhere in the document, level-indented. */
interface OutlineRow {
  id: string;
  level: string; // chip text: H1…H6
  guide: string; // indent-guide width — proportional to the heading level
  text: string;
  empty: boolean; // "(Empty heading)" — italic text
  badLevel: boolean; // skipped a level vs the previous heading — "(Incorrect heading level)" note
  flagged: boolean; // empty ∨ badLevel — the chip goes amber, Gutenberg-style
}

/** One list-view row: the recursive block tree flattened for data-p-for. */
interface TreeRow {
  id: string;
  pad: string; // depth as padding — recursion lives in state, not templates
  icon: string;
  label: string;
  anchor: string; // content preview (heading text), Gutenberg-style
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
}

// --- the dropdown behavior: a host-registered PublrJS store ------------------
//
// The dropdown MARKUP (data-p-store="local:dropdown" + data-p-on/-show/-bind/
// -portal + data-publr-part) is the whole component contract; the core
// framework wires it, and this factory supplies the actions the attributes
// name. No design-system assets needed — core publr.js + publr-position.js
// (both already vendored) carry everything.

Publr.store("dropdown", () => {
  const state = Publr.reactive({ open: false });
  let root: HTMLElement | null = null;
  let content: HTMLElement | null = null;
  let detachDismiss: (() => void) | null = null;

  const items = (): HTMLButtonElement[] =>
    content
      ? [...content.querySelectorAll<HTMLButtonElement>('[data-publr-part="item"]')].filter(
          (el) => !el.disabled && el.getAttribute("aria-disabled") !== "true",
        )
      : [];

  const focusItem = (list: HTMLButtonElement[], i: number) => {
    list.forEach((el, j) => (el.tabIndex = j === i ? 0 : -1));
    list[i]?.focus();
  };

  return {
    state,
    actions: {
      toggle: () => (state.open = !state.open),
      openMenu: (_d: unknown, ctx: { event: Event }) => {
        ctx.event.preventDefault();
        state.open = true;
      },
      close: () => (state.open = false),
      navKeys: (_d: unknown, ctx: { event: KeyboardEvent }) => {
        const e = ctx.event;
        const list = items();
        if (!list.length) return;
        const cur = list.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusItem(list, cur < list.length - 1 ? cur + 1 : 0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusItem(list, cur > 0 ? cur - 1 : list.length - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusItem(list, 0);
        } else if (e.key === "End") {
          e.preventDefault();
          focusItem(list, list.length - 1);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (cur >= 0) {
            list[cur].click();
            state.open = false;
          }
        } else if (e.key === "Escape" || e.key === "Tab") {
          e.preventDefault();
          state.open = false;
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const m = list.find((it) =>
            it.textContent?.trim().toLowerCase().startsWith(e.key.toLowerCase()),
          );
          if (m) focusItem(list, list.indexOf(m));
        }
      },
      itemClick: (_d: unknown, ctx: { event: Event }) => {
        const target = ctx.event.target;
        const item =
          target instanceof Element
            ? target.closest<HTMLButtonElement>('[data-publr-part="item"]')
            : null;
        if (item && !item.disabled && item.getAttribute("aria-disabled") !== "true")
          state.open = false;
      },
    },
    setup: ({ el }: { el: HTMLElement }) => {
      root = el;
      content = el.querySelector<HTMLElement>('[data-publr-part="content"]');
      Publr.effect(() => {
        if (state.open) {
          requestAnimationFrame(() => {
            if (!state.open || !content || !root) return;
            position(content, root, {
              placement: content.getAttribute("data-publr-placement") || "bottom-start",
              offset: 8,
            });
            // panels with a search field autofocus it; menus focus the first item
            const auto = content.querySelector<HTMLElement>("[data-publr-autofocus]");
            if (auto) auto.focus();
            else {
              const list = items();
              if (list.length) focusItem(list, 0);
            }
          });
          if (!detachDismiss) {
            const onDown = (ev: MouseEvent) => {
              if (
                !(ev.target instanceof Node) ||
                (!root?.contains(ev.target) && !content?.contains(ev.target))
              )
                state.open = false;
            };
            document.addEventListener("mousedown", onDown, true);
            detachDismiss = () => document.removeEventListener("mousedown", onDown, true);
          }
        } else {
          detachDismiss?.();
          detachDismiss = null;
        }
      });
    },
  };
});

// --- the chrome store: the entire harness as one reactive island -------------
//
// State is the single source of truth for everything the shell shows; the
// markup in index.html binds to it. Actions are what the markup can DO. The
// setup() bridges the editor's own reactive stores (history, selection) and
// its onChange into chrome state, and measures canvas geometry — the one
// place where imperative DOM reads are the point.

Publr.store("chrome", () => {
  const state = Publr.reactive({
    // top bar (undo/redo state is NOT here — that's core: markup binds to the
    // shared "editor" store's history.canUndo/canRedo directly)
    inserterOpen: false,
    // wire-output panes (behind the ⋮ menu; the item label is a conditional
    // literal in the markup — $outputShown->'Hide…'~'Show…')
    outputShown: false,
    wireEditing: "",
    wireData: "",
    // sidebar
    sidebarTab: "document",
    blockSelected: false,
    blockLabel: "",
    blockIcon: "",
    emptyNote: "No block selected.",
    breadcrumb: "Document",
    // list view (left rail, exclusive with the inserter)
    docEpoch: 0, // bumped by onChange — the model's change signal FOR EFFECTS (the model itself is not reactive)
    treeOpen: false,
    treeTab: "list",
    treeRows: [] as TreeRow[],
    treeCollapsed: {} as Record<string, boolean>,
    // outline tab: document stats + heading outline
    outlineRows: [] as OutlineRow[],
    outlineEmpty: true,
    docChars: "0",
    docWords: "0",
    docReadTime: "< 1 minute",
    // block library (left rail)
    inserterTab: "blocks",
    query: "",
    libraryEpoch: 0, // bumped on open → shelves re-derive from the live registry
    shelves: [] as { name: string; blocks: BlockItem[] }[],
    noResults: false,
  });

  // Wired by setup(); the actions close over them.
  let editor: ReturnType<typeof createEditor>;
  let canvasEl: HTMLElement;
  let wrapEl: HTMLElement;
  let inserterAnchorId: string | null = null;

  const iconOf = (type: string) => BADGES[type] ?? type[0].toUpperCase();
  const labelOf = (type: string) =>
    blockTypes().find((b) => b.type === type)?.label ?? (type === "raw-html" ? "HTML" : type);
  const asItem = (b: { type: string; label: string }): BlockItem => ({
    type: b.type,
    label: b.label,
    icon: iconOf(b.type),
  });
  const matches = (b: BlockItem, q: string) =>
    !q || b.type.includes(q) || b.label.toLowerCase().includes(q);

  // The block a single-selection context targets: the caret's block, or the
  // one explicitly selected block. Multi-selections yield null — chrome that
  // cares about "many" reads selection.blocks.length itself.
  const singleTarget = () =>
    editor.selection.blocks.length > 1
      ? null
      : (editor.selection.active ??
        (editor.selection.blocks.length === 1 ? editor.selection.blocks[0] : null));

  const plainText = (html: string | undefined): string => {
    const d = document.createElement("div");
    d.innerHTML = html ?? "";
    return d.textContent ?? "";
  };

  // List view rows: the recursive block tree FLATTENED into a list — depth
  // becomes padding, collapse prunes the walk. Runs ONLY inside its effect:
  // reading docEpoch there is what subscribes it to model edits, and every
  // run re-collects the treeCollapsed[id] deps for the CURRENT blocks — a
  // direct (untracked) call would freeze the dep set at whatever the model
  // looked like last.
  function syncTree() {
    void state.docEpoch;
    const selected = new Set(editor.selection.blocks);
    if (editor.selection.active) selected.add(editor.selection.active);
    const rows: TreeRow[] = [];
    const walk = (blocks: Block[], depth: number) => {
      for (const b of blocks) {
        const hasChildren = !!b.children && b.children.length > 0;
        const expanded = hasChildren && !state.treeCollapsed[b.id];
        rows.push({
          id: b.id,
          pad: `${4 + depth * 20}px`,
          // headings show their level (H2), Gutenberg-style
          icon: b.type === "heading" ? (b.fields.level ?? "h2").toUpperCase() : iconOf(b.type),
          label: labelOf(b.type),
          anchor: b.type === "heading" ? (b.fields.text ?? "").trim() : "",
          hasChildren,
          expanded,
          selected: selected.has(b.id),
        });
        if (expanded) walk(b.children!, depth + 1);
      }
    };
    walk(editor.getModel().blocks, 0);
    state.treeRows = rows;
  }

  // Outline: document stats + the heading outline (level chips, indent
  // guides, empty-heading warnings — Gutenberg's Document Overview). Same
  // docEpoch discipline as syncTree: runs only inside its effect.
  function syncOutline() {
    void state.docEpoch;
    const AVERAGE_WPM = 189; // Gutenberg's reading-speed constant
    const rows: OutlineRow[] = [];
    let prevLevel = 0; // previous heading's level in document order (0 = none yet)
    let chars = 0;
    let words = 0;
    const count = (text: string) => {
      chars += text.length;
      words += (text.match(/\S+/g) ?? []).length;
    };
    for (const b of flattenBlocks(editor.getModel().blocks)) {
      if (b.type === "raw-html") {
        count(plainText(b.fields.html));
        continue;
      }
      // count only CONTENT carriers — a tag field ("h2") is not prose
      for (const spec of getBlockType(b.type)?.fields ?? []) {
        if (spec.type === "text") count(b.fields[spec.name] ?? "");
        else if (spec.type === "rich") count(plainText(b.fields[spec.name]));
      }
      if (b.type === "heading") {
        const level = Number((b.fields.level ?? "h2").replace(/\D/g, "")) || 2;
        const text = (b.fields.text ?? "").trim();
        // Gutenberg's structure check: a heading may go any number of levels
        // UP, but only ONE level deeper than the previous heading — H2 → H4
        // skips H3 and reads as a broken document outline.
        const badLevel = prevLevel > 0 && level > prevLevel + 1;
        prevLevel = level;
        rows.push({
          id: b.id,
          level: `H${level}`,
          guide: `${(level - 1) * 20}px`,
          text: text || "(Empty heading)",
          empty: !text,
          badLevel,
          flagged: !text || badLevel,
        });
      }
    }
    state.docChars = String(chars);
    state.docWords = String(words);
    const minutes = Math.round(words / AVERAGE_WPM);
    state.docReadTime = minutes < 1 ? "< 1 minute" : `${minutes} minute${minutes > 1 ? "s" : ""}`;
    state.outlineRows = rows;
    state.outlineEmpty = rows.length === 0;
  }

  function syncBlockPanel() {
    const n = editor.selection.blocks.length;
    const id = singleTarget();
    const block = id ? editor.getBlock(id) : null;
    state.blockSelected = !!block;
    if (block) {
      state.blockLabel = labelOf(block.type);
      state.blockIcon = iconOf(block.type);
    }
    state.emptyNote = n > 1 ? `${n} blocks selected.` : "No block selected.";
  }

  function syncBreadcrumb() {
    const n = editor.selection.blocks.length;
    const id = singleTarget();
    // full ancestor path, Gutenberg's bottom bar: Document › Group › Heading
    const path = id ? pathToBlock(editor.getModel().blocks, id) : null;
    state.breadcrumb =
      n > 1
        ? `Document › ${n} blocks selected`
        : path
          ? ["Document", ...path.map((b) => labelOf(b.type))].join(" › ")
          : "Document";
  }

  // Gutenberg semantics: picking REPLACES an empty default block; otherwise a
  // top-level anchor inserts right after it; anything else appends at the end.
  function insertFromLibrary(type: string) {
    const anchorId = singleTarget() ?? inserterAnchorId;
    const anchor = anchorId ? editor.getBlock(anchorId) : null;
    if (anchorId && anchor?.type === "paragraph" && !plainText(anchor.fields.body).trim()) {
      editor.replaceBlock(anchorId, type);
    } else if (anchorId && anchor) {
      const model = editor.getModel();
      const at = locateBlock(model.blocks, anchorId);
      // insertBlock is a top-level primitive — a nested anchor appends at the end
      editor.insertBlock(type, at && at.list === model.blocks ? at.index + 1 : undefined);
    } else {
      editor.insertBlock(type);
    }
  }

  function setInserterOpen(open: boolean) {
    if (state.inserterOpen === open) return;
    if (open) {
      setTreeOpen(false); // the left rail hosts one panel at a time
      // capture the anchor BEFORE the search steals focus and clears `active`
      inserterAnchorId = singleTarget();
      state.query = "";
      state.libraryEpoch++; // console-registered blocks appear on the next open
    }
    state.inserterOpen = open;
    if (open) {
      // bindings flush on a microtask; focus once the panel is visible
      requestAnimationFrame(() => document.getElementById("library-search")?.focus());
    }
  }

  function setTreeOpen(open: boolean) {
    if (state.treeOpen === open) return;
    if (open) setInserterOpen(false); // ← mutual: the early-return above breaks the recursion
    state.treeOpen = open;
  }

  return {
    state,
    actions: {
      /** Chrome convention: swallow mousedown so buttons never blur the carrier. */
      swallow() {},

      // --- top bar ---------------------------------------------------------
      preview() {
        // the data-pipeline downcast IS the published shape
        const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Preview</title></head><body>${editor.serialize({ pipeline: "data" })}</body></html>`;
        window.open(URL.createObjectURL(new Blob([doc], { type: "text/html" })), "_blank");
      },
      toggleOutput: () => (state.outputShown = !state.outputShown),
      copyEditing: () => void navigator.clipboard.writeText(editor.serialize()),
      copyData: () => void navigator.clipboard.writeText(editor.serialize({ pipeline: "data" })),

      // --- sidebar -----------------------------------------------------------
      setSidebarTab(d: Dataset) {
        if (d.tab) state.sidebarTab = d.tab;
      },

      // --- block library (left rail) ----------------------------------------
      toggleInserter: () => setInserterOpen(!state.inserterOpen),
      closeInserter() {
        setInserterOpen(false);
        document.getElementById("inserter-toggle")?.focus();
      },
      setInserterTab(d: Dataset) {
        if (d.itab) state.inserterTab = d.itab;
      },
      pickBlock(d: Dataset) {
        if (d.blockType) insertFromLibrary(d.blockType); // panel stays open — Gutenberg keeps it up
      },
      libraryPickFirst() {
        const first = state.shelves[0]?.blocks[0];
        if (first) insertFromLibrary(first.type);
      },
      // --- list view (left rail) ---------------------------------------------
      toggleTree: () => setTreeOpen(!state.treeOpen),
      closeTree() {
        setTreeOpen(false);
        document.getElementById("tree-toggle")?.focus();
      },
      setTreeTab(d: Dataset) {
        if (d.ttab) state.treeTab = d.ttab;
      },
      treeToggle(d: Dataset) {
        if (d.id) state.treeCollapsed[d.id] = !state.treeCollapsed[d.id];
      },
      treeSelect(d: Dataset, ctx: { event: Event }) {
        if (!d.id) return;
        // Same modifier vocabulary as the canvas — selectBlock delegates to
        // the identical blockSel gestures, so tree and canvas can't drift.
        const e = ctx.event as MouseEvent;
        if (e.metaKey || e.ctrlKey) editor.selectBlock(d.id, { toggle: true });
        else if (e.shiftKey) editor.selectBlock(d.id, { range: true });
        else editor.selectBlock(d.id);
      },
    },

    setup({ el }: { el: HTMLElement }) {
      canvasEl = el.querySelector<HTMLElement>("#canvas")!;
      wrapEl = el.querySelector<HTMLElement>(".wrap")!;

      editor = createEditor({
        canvas: canvasEl,
        defaultBlock: "paragraph",
        groupBlock: "group", // Cmd+G wraps the selection in one of these
        // Edit tracing in the console: ?debug in the URL, or `editor.debug = true`.
        debug: new URLSearchParams(location.search).has("debug"),
        onChange: () => {
          state.wireEditing = editor.serialize();
          state.wireData = editor.serialize({ pipeline: "data" });
          syncBlockPanel(); // a transform changes the block's type under the same selection
          syncBreadcrumb();
          state.docEpoch++; // wakes effect(syncTree) — tracked, unlike a direct call
        },
      });
      Publr.editor = editor; // poke at it from the console: Publr.editor.debug = true

      // The CORE as a shared store in the island chain (data-p-store="editor"
      // sits on <body>, above the chrome island): markup binds straight to
      // core state (history.canUndo) and core actions (undo/redo) — chrome
      // never mirrors what the editor already owns. Chrome state below is
      // presentation-only.
      Publr.store("editor", {
        state: { history: editor.history, selection: editor.selection },
        actions: { undo: () => editor.undo(), redo: () => editor.redo() },
      });

      // The IN-CANVAS chrome is the shipped batteries-included layer — the
      // same attachInlineChrome every embedder gets (floating toolbar, "/"
      // quick picker, inline + inserter). The shell hand-builds only PAGE
      // chrome: top bar, rails, sidebar, breadcrumb — and plugs its library
      // rail into the inserter's Browse-all slot: the panel's target block
      // becomes the library's insertion anchor, so picking from the rail
      // still transforms the empty block the + belonged to.
      attachInlineChrome(editor, {
        container: wrapEl,
        onBrowseAll: (anchorId) => {
          setInserterOpen(true);
          if (anchorId) inserterAnchorId = anchorId;
        },
      });

      // Library shelves ← search query, grouped by the registry's category
      // metadata; Gutenberg shelf order, unknown categories trail.
      const CATEGORY_ORDER = ["Text", "Media", "Design"];
      const rank = (c: string) => {
        const i = CATEGORY_ORDER.indexOf(c);
        return i === -1 ? CATEGORY_ORDER.length : i;
      };
      effect(() => {
        void state.libraryEpoch; // re-derive on every open (live registry)
        const q = state.query.toLowerCase();
        const shelves = new Map<string, BlockItem[]>();
        for (const b of blockTypes()) {
          const it = asItem(b);
          if (!matches(it, q)) continue;
          const cat = b.category ?? "Text";
          if (!shelves.has(cat)) shelves.set(cat, []);
          shelves.get(cat)!.push(it);
        }
        state.shelves = [...shelves.entries()]
          .sort(([a], [z]) => rank(a) - rank(z))
          .map(([name, blocks]) => ({ name, blocks }));
        state.noResults = state.shelves.length === 0;
      });

      // List view rows: tracked via effect(syncTree) for the reactive reads
      // (selection highlight, collapse map) and called from onChange for
      // model edits — the model itself is NOT reactive by design.
      effect(syncTree);
      effect(syncOutline); // tracks docEpoch only — the outline ignores selection

      // Reveal the selection: selecting inside a collapsed container (from
      // the canvas) un-collapses its ancestors so the highlight is visible.
      effect(() => {
        const id = editor.selection.active ?? editor.selection.blocks[0];
        if (!id) return;
        const path = pathToBlock(editor.getModel().blocks, id);
        if (!path) return;
        for (const b of path.slice(0, -1)) {
          if (state.treeCollapsed[b.id]) state.treeCollapsed[b.id] = false;
        }
      });

      // Bridges: the editor's reactive selection → chrome's derived view state.
      effect(syncBlockPanel);
      effect(syncBreadcrumb);

      // The library's insertion anchor follows the caret while the panel is up.
      const onSelectionChange = () => {
        if (state.inserterOpen) inserterAnchorId = singleTarget() ?? inserterAnchorId;
      };
      document.addEventListener("selectionchange", onSelectionChange);

      // Load last: onChange (wire panes + geometry syncs) touches everything
      // above. The seed template rides index.html's own indentation — dedent
      // so raw-html passthroughs don't carry the page's formatting onto the
      // wire.
      const dedent = (html: string): string => {
        const lines = html.split("\n");
        const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length);
        const cut = Math.min(...indents);
        return lines
          .map((l) => l.slice(cut))
          .join("\n")
          .trim();
      };
      editor.loadHtml(dedent(document.getElementById("seed")!.innerHTML));

      return () => document.removeEventListener("selectionchange", onSelectionChange);
    },
  };
});
