// editor.ts — createEditor: the contenteditable canvas over a block model.
//
// Two invariants everything here obeys:
// - Every model mutation flows through one commit() choke point, where
//   history is recorded. Nothing mutates `model` anywhere else.
// - The canvas is an uncontrolled contenteditable surface: model → DOM only
//   via explicit renders (renderCanvas / time travel), DOM → model only via
//   input events. Native browser undo is DISOWNED (intercepted and routed to
//   our history) — it would revert the DOM behind the model's back.

import {
  EDITABLE_SELECTOR,
  RAW_TYPE,
  escHtml,
  mintId,
  readCarrier,
  scopedCarriers,
} from "./carriers";
import type { Block, CarrierKind, Model } from "./carriers";
import { blockToElement, downcast, upcast } from "./cast";
import type { DowncastPipeline } from "./cast";
import { formatState, selectItemRange, toggleMark } from "./format";
import { createHistory } from "./history";
import {
  DEFAULT_BLOCK_POLICY,
  resolveBlockPolicy,
  resolveRootPolicy,
  summarizeRootPolicy,
} from "./policy";
import type { BlockPolicy, EditorPolicy, PolicyConfig, RootPolicy } from "./policy";
import { getBlockType } from "./registry";
import { createBlockSelection } from "./selection";
import { locateBlock, pathToBlock } from "./tree";

export interface EditorOptions {
  /** HTMLElement the editor renders into. */
  canvas: HTMLElement;
  /** Block type Enter-splitting creates (e.g. "paragraph"). */
  defaultBlock: string;
  /**
   * Container type Cmd+G wraps a selection in (e.g. "group") — must be a
   * registered type whose render emits a data-pb-children slot. Grouping is
   * disabled when absent.
   */
  groupBlock?: string;
  /** Fired after every committed model change (incl. undo/redo). */
  onChange?: () => void;
  /** Clock override for tests (defaults to Date.now). */
  now?: () => number;
  /** Log every edit to the console (also toggleable: editor.debug = true). */
  debug?: boolean;
  /**
   * Ghost prompt shown on an empty default block (canvas chrome, never
   * serialized); pass "" to disable.
   */
  placeholder?: string;
  /**
   * Editing policy for this editor (instance/global scope): allowed blocks,
   * orderability, a preset, and per-type overrides. A runtime schema layer —
   * never serialized, never read off the DOM (thoughts/010). PARSE ONLY in
   * Phase A: nothing enforces it yet.
   */
  policy?: PolicyConfig;
}

// Where the user is: block + carrier field + character offset of the caret
// within the carrier (measured over text content, so it survives the
// re-render — the restored DOM has different nodes but the same text).
interface CaretSnapshot {
  blockId: string;
  field?: string | null;
  offset?: number;
}

// History entries are {model, selection} snapshots; the model is plain JSON
// by construction (round-trip law), so structuredClone is a complete snapshot.
interface HistoryEntry {
  model: Model;
  selection: CaretSnapshot | null;
}

export function createEditor({
  canvas,
  defaultBlock,
  groupBlock,
  onChange,
  now = Date.now,
  debug = false,
  placeholder = "Type / to choose a block",
  policy: policyConfig = {},
}: EditorOptions) {
  let model: Model = { blocks: [] };

  // The policy layer: resolved from config once, held in the running instance,
  // never on the block model (policy on Block.* would ride structuredClone into
  // history yet be dropped by downcast → break the round-trip law) and never
  // serialized. Per-block effective policy is DERIVED on query (thoughts/010).
  const rootPolicy: RootPolicy = resolveRootPolicy(policyConfig);

  // The undo/redo keys are canvas-scoped (a host page's own Cmd+Z must not
  // reach us), so the canvas must be able to HOLD focus when no carrier can —
  // e.g. after deleting every block. tabindex=-1: programmatically focusable,
  // not in the tab order.
  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = -1;

  // Editor-driven mutations must never drop focus out of the editor —
  // keyboard undo dies the moment focus lands on <body>.
  function ensureCanvasFocus() {
    if (!canvas.contains(document.activeElement)) canvas.focus({ preventScroll: true });
  }

  // onChange fires on a microtask, AFTER the editor settles: mid-commit the
  // model is mutated but the canvas isn't re-rendered yet, and chrome reading
  // both would see torn state (a DOM root whose block no longer exists).
  // Subscribers ride the same microtask: layered chrome (attachInlineChrome)
  // observes changes WITHOUT stealing the host's onChange slot.
  const subscribers = new Set<() => void>();
  const notify = () =>
    queueMicrotask(() => {
      onChange?.();
      for (const fn of subscribers) fn();
    });

  // Debug tracing: every model change (commit, undo/redo, load) in one line.
  // console.log, not console.debug — tracing is explicitly opt-in, and
  // DevTools hides the Verbose level (console.debug) by default.
  let debugOn = !!debug;
  const trace = (...args: unknown[]) => debugOn && console.log("[publr-editor]", ...args);
  const depths = () => `undo ${history.flags.undoDepth} · redo ${history.flags.redoDepth}`;

  const typeOverrides = Object.keys(policyConfig.blocks ?? {}).length;
  trace(
    `policy: ${summarizeRootPolicy(rootPolicy)}${typeOverrides ? ` · ${typeOverrides} type-override${typeOverrides === 1 ? "" : "s"}` : ""}`,
  );

  // --- history ---------------------------------------------------------------

  const history = createHistory<HistoryEntry>({ now });
  const snapshot = (): HistoryEntry => ({
    model: structuredClone(model),
    selection: captureSelection(),
  });

  // Undo-of-split restores exactly: the snapshot is taken before the
  // mutation, while the caret still sits at the split point. For typing, the
  // input event fires after the DOM changed, so the captured offset can sit
  // one keystroke past the run's start — clamped on restore, close enough.
  function captureSelection(): CaretSnapshot | null {
    const el = document.activeElement;
    const root = el && canvas.contains(el) ? el.closest("[data-pb-id]") : null;
    if (!el || !root) return null;
    const out: CaretSnapshot = { blockId: root.getAttribute("data-pb-id")! };
    const carrier = el.closest(EDITABLE_SELECTOR);
    const sel = window.getSelection();
    if (carrier && sel?.rangeCount && carrier.contains(sel.getRangeAt(0).startContainer)) {
      const at = sel.getRangeAt(0);
      const r = document.createRange();
      r.selectNodeContents(carrier);
      r.setEnd(at.startContainer, at.startOffset);
      out.field = carrier.getAttribute("data-pb-text") ?? carrier.getAttribute("data-pb-rich");
      out.offset = r.toString().length;
    }
    return out;
  }

  // Put the caret back: at the captured character offset when we have one
  // (walking the restored carrier's text nodes, clamped to its end), else at
  // the end of the block's last editable carrier.
  function restoreSelection(s: CaretSnapshot | null) {
    if (!s) return;
    const root = rootOf(s.blockId);
    if (!root) return;
    const carrier =
      s.offset != null &&
      scopedCarriers(root).find(
        (el) =>
          el.isContentEditable &&
          (el.getAttribute("data-pb-text") === s.field ||
            el.getAttribute("data-pb-rich") === s.field),
      );
    if (!carrier) return focusEdge(s.blockId, "end");

    carrier.focus({ preventScroll: true });
    const range = document.createRange();
    let remaining = s.offset!;
    let placed = false;
    const walker = document.createTreeWalker(carrier, NodeFilter.SHOW_TEXT);
    for (let node: Text | null; (node = walker.nextNode() as Text | null); ) {
      if (remaining <= node.data.length) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        break;
      }
      remaining -= node.data.length;
    }
    if (!placed) {
      range.selectNodeContents(carrier);
      range.collapse(false); // offset beyond the restored text — clamp to end
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  // THE mutation choke point. meta.key marks the commit as coalescable —
  // typing passes one, structural edits don't (see history.record);
  // meta.label names the edit for debug tracing.
  function commit(mutate: (model: Model) => void, meta: { key?: string; label?: string } = {}) {
    const fresh = history.record(snapshot, meta.key ?? null);
    mutate(model);
    trace(
      `commit: ${meta.label ?? meta.key ?? "edit"}`,
      fresh ? "· new entry" : "· coalesced",
      `· ${depths()}`,
    );
    notify();
  }

  // Restore a history entry: swap the model, re-derive the canvas from it
  // (the canvas never changes any other way), put the caret back.
  function timeTravel(op: (getCurrent: () => HistoryEntry) => HistoryEntry | null, label: string) {
    const entry = op(snapshot);
    if (!entry) return trace(`${label}: nothing to ${label}`);
    model = entry.model;
    renderCanvas();
    restoreSelection(entry.selection);
    trace(
      `${label} → ${model.blocks.length} block${model.blocks.length === 1 ? "" : "s"}`,
      `· ${depths()}`,
    );
    notify();
  }

  const undo = () => timeTravel(history.undo, "undo");
  const redo = () => timeTravel(history.redo, "redo");

  // --- block multiselection ----------------------------------------------------
  // Native selection crossing a block boundary promotes to block-level
  // selection (see selection.ts). Deletion of the selected run is handled at
  // the DOCUMENT level in the capture phase: after a mouse drag, focus isn't
  // reliably inside any carrier, so canvas-level keydown would miss the key —
  // and capture makes this win over the single-block Backspace handler below.

  const blockSel = createBlockSelection({
    canvas,
    getBlocks: () => model.blocks,
    onChange: (ids) => {
      trace(ids.length ? `select: ${ids.length} blocks` : "select: none");
      // Escape (and other purely-explicit clears) change the selection with
      // NO selectionchange/focus event — the ghost check must ride this too.
      checkGhost();
    },
  });

  function onMultiDelete(event: KeyboardEvent) {
    if (
      (event.key !== "Backspace" && event.key !== "Delete") ||
      event.defaultPrevented ||
      !blockSel.active()
    )
      return;
    event.preventDefault();
    const ids = blockSel.ids;
    const first = locate(ids[0]);
    const prev = first && first.index > 0 ? first.list[first.index - 1] : undefined;
    commit(
      () => {
        // per-id locate: ids may live in different sibling lists (cmd+click),
        // and deleting a container already removed its descendants
        for (const id of ids) {
          const at = locate(id);
          if (at) at.list.splice(at.index, 1);
        }
      },
      { label: `remove ${ids.length} block${ids.length === 1 ? "" : "s"}` },
    );
    renderCanvas();
    window.getSelection()?.removeAllRanges();
    if (prev) focusEdge(prev.id, "end");
    else if (model.blocks.length) focusEdge(model.blocks[0].id, "start");
    ensureCanvasFocus(); // empty doc / raw-html-first: the canvas itself holds focus
  }
  document.addEventListener("keydown", onMultiDelete, true);

  // --- model/DOM lookups -------------------------------------------------------
  // The model is a tree: every lookup that used to index model.blocks now
  // locates the SIBLING LIST containing the block (tree.ts) and splices that.

  const locate = (id: string) => locateBlock(model.blocks, id);
  const findBlock = (id: string) => locate(id)?.block;
  const rootOf = (id: string) =>
    canvas.querySelector<HTMLElement>(`[data-pb-id="${CSS.escape(id)}"]`);
  const blockAt = (el: Element | null | undefined): Block | undefined => {
    const root = el?.closest("[data-pb-block]"); // NEAREST root — nested carriers belong to the nested block
    return root ? findBlock(root.getAttribute("data-pb-id") ?? "") : undefined;
  };
  const carrierAt = (target: EventTarget | null): HTMLElement | null =>
    target instanceof Element ? target.closest<HTMLElement>(EDITABLE_SELECTOR) : null;

  function makeBlock(type: string, seedChildren = true): Block {
    const def = getBlockType(type);
    const fields = Object.fromEntries((def?.fields ?? []).map((f) => [f.name, f.default]));
    const block: Block = { type, id: mintId(), fields, classes: "" };
    // Sparse: {} = every island value at its declared default. Presence keyed
    // on the TYPE declaring island settings, mirroring `children` on containers.
    if (def?.islandSettings.length) block.settings = {};
    if (def?.acceptsChildren) {
      // A freshly inserted container starts with one empty default block —
      // the container itself has no carriers, so this is what makes it
      // immediately editable (ghost prompt live, caret has somewhere to go).
      // A declared childTemplate wins (Gutenberg innerBlocks template — a
      // list seeds one list-item, not a paragraph).
      const defaultDef = getBlockType(defaultBlock);
      block.children = !seedChildren
        ? []
        : def.childTemplate
          ? def.childTemplate.filter((t) => getBlockType(t)).map((t) => makeBlock(t))
          : defaultDef && !defaultDef.acceptsChildren
            ? [makeBlock(defaultBlock)]
            : [];
    }
    return block;
  }

  // A slot's allowedChildren gates what the EDITOR puts there — split,
  // transform and replace are refused; upcast stays permissive. The document
  // root accepts everything.
  function slotAccepts(parent: Block | null, type: string): boolean {
    const allow = parent && getBlockType(parent.type)?.allowedChildren;
    return !allow || allow.includes(type);
  }

  // --- canvas rendering --------------------------------------------------------

  const isEmptyValue = (v: string | undefined) => !(v ?? "").replace(/<br\s*\/?>/g, "").trim();

  function decorate(root: HTMLElement, block: Block) {
    if (block.type === RAW_TYPE) {
      root.classList.add("pbe-raw"); // opaque, not untouchable: click selects the block
      return;
    }
    // Container blocks read as invisible wrappers; the class lets canvas
    // chrome (hover bounds) target them without knowing any type names.
    if (block.children) root.classList.add("pbe-container");
    for (const carrier of scopedCarriers(root)) {
      if (carrier.hasAttribute("data-pb-text")) {
        try {
          carrier.contentEditable = "plaintext-only";
        } catch {
          carrier.contentEditable = "true";
        }
      } else if (carrier.hasAttribute("data-pb-rich")) {
        carrier.contentEditable = "true";
      }
    }
    // Ghost prompt while the block is empty — canvas chrome only, never part
    // of the serialized output. A block's own `placeholder` (declared
    // editor-UI metadata) wins; the default block falls back to the editor's
    // prompt ("Type / to choose a block").
    const ph =
      getBlockType(block.type)?.placeholder ?? (block.type === defaultBlock ? placeholder : null);
    if (ph) {
      const first = scopedCarriers(root).find(
        (el) => el.hasAttribute("data-pb-text") || el.hasAttribute("data-pb-rich"),
      );
      if (first) {
        const field = first.getAttribute("data-pb-text") ?? first.getAttribute("data-pb-rich");
        first.setAttribute("data-pbe-ph", ph);
        first.classList.toggle("pbe-empty", isEmptyValue(block.fields[field ?? ""]));
      }
    }
  }

  // Decoration recurses: every nested block's root gets its own carrier
  // wiring and ghost prompt (decorate() is scoped per root by design).
  function decorateTree(root: HTMLElement, block: Block) {
    decorate(root, block);
    for (const child of block.children ?? []) {
      const el = root.querySelector<HTMLElement>(`[data-pb-id="${CSS.escape(child.id)}"]`);
      if (el) decorateTree(el, child);
    }
  }

  function renderCanvas() {
    canvas.textContent = "";
    for (const block of model.blocks) {
      const root = blockToElement(block);
      if (!root) continue;
      decorateTree(root, block);
      canvas.appendChild(root);
    }
    blockSel.clear(); // fresh roots — any block selection is stale now
  }

  // Re-render ONE block in place, preserving caret and block-selection state —
  // for edits that change a block's presentation without touching structure.
  function rerenderBlock(id: string) {
    const block = findBlock(id);
    const old = rootOf(id);
    if (!block || !old) return renderCanvas();
    const sel = captureSelection();
    const fresh = blockToElement(block);
    if (!fresh) return;
    decorateTree(fresh, block);
    if (old.classList.contains("pbe-selected")) fresh.classList.add("pbe-selected");
    old.replaceWith(fresh);
    restoreSelection(sel);
  }

  // Caret to the start/end of a block's first/last editable carrier —
  // DELIBERATELY unscoped: a container's editable surface is its children's
  // carriers (the container itself has none).
  function focusEdge(id: string, edge: "start" | "end") {
    const root = rootOf(id);
    const carriers = root
      ? [
          ...(root.matches(EDITABLE_SELECTOR) ? [root] : []),
          ...root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR),
        ].filter((el) => el.isContentEditable)
      : [];
    const target = edge === "start" ? carriers[0] : carriers[carriers.length - 1];
    if (!target) return;
    target.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(edge === "start");
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  // --- canvas events: DOM → model, always through commit() ------------------

  // Native browser undo is disowned: both entry points — the keystroke and
  // the input event some UAs emit for menu-driven undo — are intercepted and
  // routed to our history.
  canvas.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (!(event.metaKey || event.ctrlKey) || (key !== "z" && key !== "y")) return;
    event.preventDefault();
    if (key === "y" || event.shiftKey) redo();
    else undo();
  });

  canvas.addEventListener("beforeinput", (event) => {
    if (event.inputType === "historyUndo") {
      event.preventDefault();
      undo();
    } else if (event.inputType === "historyRedo") {
      event.preventDefault();
      redo();
    }
  });

  canvas.addEventListener("input", (event) => {
    const carrier = carrierAt(event.target);
    const block = carrier && blockAt(carrier);
    if (!carrier || !block) return;
    const kind: CarrierKind = carrier.hasAttribute("data-pb-text") ? "text" : "rich";
    const field = carrier.getAttribute(`data-pb-${kind}`)!;
    commit(
      () => {
        block.fields[field] = readCarrier(carrier, kind);
      },
      { key: `field:${block.id}:${field}`, label: `type ${block.id}.${field}` },
    );
    if (carrier.hasAttribute("data-pbe-ph"))
      carrier.classList.toggle("pbe-empty", isEmptyValue(block.fields[field]));
  });

  // Enter splits at the caret: current block keeps the text before, a fresh
  // defaultBlock gets the text after and is inserted as the next sibling.
  // Slots that reject the default block still split — into a sibling of the
  // SAME type when the slot accepts it (Gutenberg list-item semantics).
  // Fields where a newline is content (preformatted, noSplit) keep native
  // Enter instead.
  canvas.addEventListener("keydown", (event) => {
    const defaultDef = getBlockType(defaultBlock);
    if (event.key !== "Enter" || event.shiftKey || event.defaultPrevented || !defaultDef) return;
    const carrier = carrierAt(event.target);
    const block = carrier && blockAt(carrier);
    if (!carrier || !block || !carrier.isContentEditable) return;

    const kind: CarrierKind = carrier.hasAttribute("data-pb-text") ? "text" : "rich";
    const field = carrier.getAttribute(`data-pb-${kind}`)!;
    const def = getBlockType(block.type);
    const spec = def?.fields.find((f) => f.name === field);
    if (spec?.preformatted || def?.noSplit?.includes(field)) return; // native Enter

    const at0 = locate(block.id);
    if (!at0) return;
    let splitType = defaultBlock;
    let splitDef = defaultDef;
    if (!slotAccepts(at0.parent, defaultBlock)) {
      if (!slotAccepts(at0.parent, block.type) || !def) return; // the slot takes neither
      splitType = block.type;
      splitDef = def;
    }
    event.preventDefault();

    let before = readCarrier(carrier, kind);
    let after = "";
    const sel = window.getSelection();
    if (sel?.rangeCount && carrier.contains(sel.getRangeAt(0).startContainer)) {
      const at = sel.getRangeAt(0);
      const half = (toStart: boolean) => {
        const r = document.createRange();
        r.selectNodeContents(carrier);
        if (toStart) r.setEnd(at.startContainer, at.startOffset);
        else r.setStart(at.endContainer, at.endOffset);
        const tmp = document.createElement("div");
        tmp.appendChild(r.cloneContents());
        return kind === "text" ? (tmp.textContent ?? "") : tmp.innerHTML;
      };
      before = half(true);
      after = half(false);
    }

    const next = makeBlock(splitType);
    const target = splitDef.fields.find((f) => f.type === "rich" || f.type === "text");
    if (target)
      next.fields[target.name] = kind === "text" && target.type === "rich" ? escHtml(after) : after;

    const at = locate(block.id);
    if (!at) return;
    commit(
      () => {
        block.fields[field] = before;
        at.list.splice(at.index + 1, 0, next); // sibling in the SAME container
      },
      { label: `split ${block.id} → ${next.id}` },
    );
    renderCanvas();
    focusEdge(next.id, "start");
  });

  // Backspace at the very START of a block merges it into the previous one
  // (the inverse of Enter-split). Kind conversion at the seam: rich→rich
  // keeps markup, rich→text strips it, text→rich escapes it. An empty source
  // is just removed; an unmergeable previous block (raw-html) gets SELECTED —
  // the second Backspace deletes it via the group-delete path.
  const richText = (html: string): string => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent ?? "";
  };

  canvas.addEventListener("keydown", (event) => {
    if (event.key !== "Backspace" || event.defaultPrevented) return;
    const carrier = carrierAt(event.target);
    const block = carrier && blockAt(carrier);
    if (!carrier || !block || !carrier.isContentEditable) return;

    // caret must be collapsed at character offset 0 of the block's FIRST
    // editable carrier — everywhere else Backspace stays native
    const winSel = window.getSelection();
    if (
      !winSel?.rangeCount ||
      !winSel.isCollapsed ||
      !carrier.contains(winSel.getRangeAt(0).startContainer)
    )
      return;
    const probe = document.createRange();
    probe.selectNodeContents(carrier);
    probe.setEnd(winSel.getRangeAt(0).startContainer, winSel.getRangeAt(0).startOffset);
    if (probe.toString().length !== 0) return;
    const blockRoot = rootOf(block.id);
    const editables = blockRoot
      ? scopedCarriers(blockRoot).filter((el) => el.isContentEditable)
      : [];
    if (editables[0] !== carrier) return;

    const at = locate(block.id);
    if (!at) return;
    const prev = at.list[at.index - 1];
    if (!prev) return; // start of its container — nowhere to merge (POC: no group escape)
    event.preventDefault();

    const kind: CarrierKind = carrier.hasAttribute("data-pb-text") ? "text" : "rich";
    const field = carrier.getAttribute(`data-pb-${kind}`)!;
    const source = String(block.fields[field] ?? "");
    const sourceEmpty = !source.replace(/<br\s*\/?>/g, "").trim();

    if (sourceEmpty) {
      commit(
        () => {
          at.list.splice(at.index, 1);
        },
        { label: `remove ${block.id} (${block.type})` },
      );
      renderCanvas();
      focusEdge(prev.id, "end");
      ensureCanvasFocus();
      return;
    }

    const target = getBlockType(prev.type)
      ?.fields.filter((f) => f.type === "text" || f.type === "rich")
      .pop();
    if (!target) {
      blockSel.select(prev.id); // unmergeable: select it; next Backspace deletes
      return;
    }

    const prevVal = String(prev.fields[target.name] ?? "");
    const joinOffset = target.type === "text" ? prevVal.length : richText(prevVal).length;
    const addition =
      target.type === "rich"
        ? kind === "rich"
          ? source
          : escHtml(source)
        : kind === "rich"
          ? richText(source)
          : source;

    commit(
      () => {
        prev.fields[target.name] = prevVal + addition;
        at.list.splice(at.index, 1);
      },
      { label: `merge ${block.id} into ${prev.id}` },
    );
    renderCanvas();
    restoreSelection({ blockId: prev.id, field: target.name, offset: joinOffset });
    ensureCanvasFocus();
  });

  // The APPENDER: clicking below the last block appends an empty default
  // block (its ghost prompt + the slash menu take it from there) — or
  // refocuses a trailing empty one instead of stacking empties. Works on
  // EVERY list: the root for clicks on the canvas itself, a container's
  // children for clicks on the container's own surface below its last child
  // (an empty container appends anywhere on its surface). Clicks in the gaps
  // BETWEEN blocks are not ours — selection handles those, which is also why
  // this runs in the CAPTURE phase and preventDefaults: block selection
  // honors defaultPrevented, so an owned append never doubles as a
  // select-the-container click. Modified clicks stay selection gestures.
  // Hosts provide the root click area via canvas bottom padding; containers
  // provide theirs via their own padding.
  canvas.addEventListener(
    "mousedown",
    (event) => {
      const defaultDef = getBlockType(defaultBlock);
      if (event.button !== 0 || !defaultDef) return;
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;

      let list: Block[];
      let containerId: string | null = null;
      if (event.target === canvas) {
        list = model.blocks;
      } else {
        // Nearest block root must be the container ITSELF — a click inside a
        // child never reaches this (its own root is nearer).
        const rootEl =
          event.target instanceof Element ? event.target.closest("[data-pb-id]") : null;
        const block = rootEl ? findBlock(rootEl.getAttribute("data-pb-id") ?? "") : undefined;
        if (!block?.children) return;
        list = block.children;
        containerId = block.id;
      }

      const last = list[list.length - 1] as Block | undefined;
      const lastRoot = last && rootOf(last.id);
      if (lastRoot && event.clientY <= lastRoot.getBoundingClientRect().bottom) return;
      event.preventDefault(); // we place the caret ourselves; also hands selection its keep-out signal

      const textish = defaultDef.fields.filter((f) => f.type === "text" || f.type === "rich");
      if (last?.type === defaultBlock && textish.every((f) => isEmptyValue(last.fields[f.name]))) {
        focusEdge(last.id, "end");
        return;
      }
      // Switching containers cancels a still-empty ghost from a previous
      // append — BEFORE this commit, so the cancel stays history-transparent.
      if (ghost) {
        const g = ghost;
        ghost = null;
        abandonGhost(g);
      }
      const next = makeBlock(defaultBlock);
      commit(
        () => {
          list.push(next);
        },
        { label: `append ${defaultBlock}${containerId ? ` in ${containerId}` : ""}` },
      );
      renderCanvas();
      focusEdge(next.id, "start");
      ensureCanvasFocus();
      // Container appends are PROVISIONAL: leave the paragraph without ever
      // giving it content and it disappears (see abandonGhost). Root appends
      // persist — the trailing empty is the document's writing prompt.
      ghost = containerId ? { id: next.id, depth: history.flags.undoDepth } : null;
    },
    true,
  );

  // --- ghost lifecycle: provisional container appends --------------------------
  // The ghost is the paragraph a container-append minted. The moment the
  // caret and block selection both move off it while it is still an empty
  // default block, it is removed — to the user it never existed.

  let ghost: { id: string; depth: number } | null = null;

  // When nothing else was recorded since the append, the removal is an UNDO
  // of the append with the redo discarded (history.drop): this mutates the
  // model outside commit() BY DESIGN — a committed removal would leave an
  // insert+remove pair in history for a block the user never touched. Either
  // way the DOM edit is surgical (no renderCanvas): the caret has just landed
  // wherever the user clicked and must survive.
  function abandonGhost(g: { id: string; depth: number }) {
    const at = locate(g.id);
    if (!at || !at.parent) return; // gone, or escaped to the root (ungroup) — not ours anymore
    const def = getBlockType(defaultBlock);
    const textish = (def?.fields ?? []).filter((f) => f.type === "text" || f.type === "rich");
    if (
      at.block.type !== defaultBlock ||
      !textish.every((f) => isEmptyValue(at.block.fields[f.name]))
    )
      return; // it grew content — a real block now
    const root = rootOf(g.id);
    if (history.flags.undoDepth === g.depth && history.flags.redoDepth === 0) {
      history.drop();
      at.list.splice(at.index, 1);
      root?.remove();
      trace(`ghost ${g.id} abandoned — append canceled · ${depths()}`);
      notify();
    } else {
      commit(
        () => {
          at.list.splice(at.index, 1);
        },
        { label: `remove abandoned ${g.id}` },
      );
      root?.remove();
    }
  }

  // Same signals that drive selection's refresh(), registered AFTER it so the
  // reactive state is fresh when read. Being block-selected counts as
  // attention — the cmd+A ladder must not eat its own first rung.
  function checkGhost() {
    if (!ghost) return;
    if (blockSel.state.active === ghost.id || blockSel.ids.includes(ghost.id)) return;
    const g = ghost;
    ghost = null;
    abandonGhost(g);
  }
  document.addEventListener("selectionchange", checkGhost);
  document.addEventListener("focusin", checkGhost);
  document.addEventListener("focusout", checkGhost);

  // --- grouping: Cmd+G wraps, Shift+Cmd+G unwraps ------------------------------
  // Document-level capture for the same reason as multi-delete: after a drag
  // selection focus isn't reliably inside the canvas. Both are editor-context
  // keys — never allowed to fall through to the browser's find-next/previous.

  const groupDef = () => {
    const def = groupBlock ? getBlockType(groupBlock) : undefined;
    return def?.acceptsChildren ? def : undefined;
  };

  // The nearest enclosing container — the block itself when it IS one. What
  // ungroup acts on; chrome enables its Ungroup control off this.
  function containerOf(id: string | null | undefined): Block | null {
    const path = id ? pathToBlock(model.blocks, id) : null;
    if (!path) return null;
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i].children) return path[i];
    }
    return null;
  }

  // Wrap the ids (default: the block selection) in a fresh container. The ids
  // must be siblings — one list, any order/gaps; the wrapper lands at the
  // first member's position and the members keep their document order.
  function groupBlocks(ids: string[] = blockSel.ids): Block | null {
    if (!groupBlock || !groupDef() || !ids.length) return null;
    const located = ids.map((id) => locate(id));
    const first = located[0];
    if (!first || located.some((at) => !at || at.list !== first.list)) {
      trace(`group: ids are not siblings — refused`);
      return null;
    }
    const wrapper = makeBlock(groupBlock, false); // children come from the selection, not the seed
    const idSet = new Set(ids);
    const insertAt = Math.min(...located.map((at) => at!.index));
    commit(
      () => {
        const members: Block[] = [];
        for (let i = first.list.length - 1; i >= 0; i--) {
          if (idSet.has(first.list[i].id)) members.unshift(first.list.splice(i, 1)[0]);
        }
        wrapper.children = members;
        first.list.splice(insertAt, 0, wrapper);
      },
      { label: `group ${ids.length} block${ids.length === 1 ? "" : "s"} → ${wrapper.id}` },
    );
    renderCanvas();
    blockSel.select(wrapper.id);
    ensureCanvasFocus();
    return wrapper;
  }

  // Unwrap the nearest container of `id` (default: the selected block, else
  // the caret's block): its children splice into its place. A caret inside
  // survives; otherwise the released run reads as selected.
  function ungroupBlock(id?: string): boolean {
    const target = containerOf(id ?? blockSel.ids[0] ?? blockSel.state.active);
    const at = target && locate(target.id);
    if (!target || !at) return false;
    const kids = target.children ?? [];
    const sel = captureSelection();
    commit(
      () => {
        at.list.splice(at.index, 1, ...kids);
      },
      { label: `ungroup ${target.id} (${kids.length} released)` },
    );
    renderCanvas();
    if (sel && sel.blockId !== target.id) restoreSelection(sel);
    else if (kids.length) blockSel.selectMany(kids.map((b) => b.id));
    ensureCanvasFocus();
    return true;
  }

  // Enter with a BLOCK selection inserts a fresh default block below it —
  // the only "type after this" a carrier-less block (group, raw-html) can
  // offer. Document-level capture, same reason as multi-delete: after a
  // click-select, focus isn't reliably inside the canvas.
  function onBlockEnter(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.defaultPrevented || !blockSel.active()) return;
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    // Enter in chrome outside the canvas (inserter search, toolbar buttons)
    // belongs to that chrome, block selection or not.
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      !canvas.contains(focused) &&
      (focused.matches("input, textarea, select, button") || focused.isContentEditable)
    )
      return;
    const defaultDef = getBlockType(defaultBlock);
    if (!defaultDef) return;
    const ids = blockSel.ids;
    const at = locate(ids[ids.length - 1]); // below the selection = after its LAST block
    if (!at) return;
    event.preventDefault();
    const next = makeBlock(defaultBlock);
    commit(
      () => {
        at.list.splice(at.index + 1, 0, next);
      },
      { label: `enter after ${at.block.id} → ${next.id}` },
    );
    renderCanvas();
    window.getSelection()?.removeAllRanges();
    focusEdge(next.id, "start");
    ensureCanvasFocus();
  }
  document.addEventListener("keydown", onBlockEnter, true);

  function onGroupKeys(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.defaultPrevented) return;
    if (event.key.toLowerCase() !== "g") return;
    if (event.shiftKey) {
      const anchor = blockSel.ids[0] ?? blockSel.state.active;
      if (!anchor || !containerOf(anchor)) return; // not ours — no container in reach
      event.preventDefault();
      ungroupBlock();
    } else {
      if (!groupDef() || !blockSel.active()) return; // grouping needs a block selection
      event.preventDefault();
      groupBlocks();
    }
  }
  document.addEventListener("keydown", onGroupKeys, true);

  // --- public API ------------------------------------------------------------

  return {
    history: history.flags, // reactive { canUndo, canRedo, undoDepth, redoDepth }
    selection: blockSel.state, // reactive { blocks: [id, …], active } — block-level multiselection
    undo,
    redo,

    /** The element the editor renders into — chrome parks floating UI against it. */
    canvas,

    /** The block type Enter-splitting creates — chrome scopes its slash/appender affordances to it. */
    defaultBlock,

    /** Observe committed model changes (incl. undo/redo/load) without claiming the onChange option. Returns unsubscribe. */
    subscribe(fn: () => void): () => void {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    /** Detach document-level listeners (selectionchange, multiselect + grouping keys, ghost tracking). */
    destroy() {
      document.removeEventListener("keydown", onMultiDelete, true);
      document.removeEventListener("keydown", onBlockEnter, true);
      document.removeEventListener("keydown", onGroupKeys, true);
      document.removeEventListener("selectionchange", checkGhost);
      document.removeEventListener("focusin", checkGhost);
      document.removeEventListener("focusout", checkGhost);
      blockSel.destroy();
    },

    // Console-toggleable edit tracing: editor.debug = true
    get debug() {
      return debugOn;
    },
    set debug(v: boolean) {
      debugOn = !!v;
    },

    getModel: (): Model => model,
    getBlock: (id: string): Block | undefined => findBlock(id),

    /**
     * The resolved editing policy (Phase A) — a runtime schema layer, sourced
     * from createEditor({ policy }), never from the DOM and never serialized
     * (thoughts/010). PARSE-FREE and enforcement-free today; A2+ reads it.
     */
    get policy(): EditorPolicy {
      return { root: rootPolicy };
    },

    /**
     * Effective policy for one block: its type's createEditor override merged
     * over the permissive default. Registry type rules and per-instance context
     * (patterns) merge in as later phases wire them. Unknown id → default.
     */
    blockPolicy: (id: string): BlockPolicy => {
      const block = findBlock(id);
      return block ? resolveBlockPolicy(policyConfig, block.type) : DEFAULT_BLOCK_POLICY;
    },

    /**
     * Select a block programmatically (tree view / chrome): caret into its
     * first editable carrier when it has one; BLOCK selection otherwise —
     * containers select as a whole (their carriers belong to their children),
     * and so do opaque blocks (raw-html). Scrolls the block into view.
     *
     * Modifier semantics REUSE the canvas gestures: `toggle` = Cmd/Ctrl+click
     * (add/remove one block, non-contiguous ok), `range` = Shift+click
     * (sibling run from the current anchor — caret's block, else the
     * selection's first block — via the same native root-level range the
     * canvas asserts).
     */
    selectBlock(id: string, opts: { toggle?: boolean; range?: boolean } = {}) {
      const block = findBlock(id);
      const root = rootOf(id);
      if (!block || !root) return;
      root.scrollIntoView({ block: "nearest" });
      if (opts.toggle) {
        blockSel.toggle(id);
        return;
      }
      if (opts.range) {
        const from = blockSel.state.active ?? blockSel.ids[0];
        if (from && from !== id) blockSel.range(from, id);
        else blockSel.select(id); // no anchor: Shift behaves like a block click
        return;
      }
      const carriers = [
        ...(root.matches(EDITABLE_SELECTOR) ? [root] : []),
        ...root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR),
      ].filter((el) => el.isContentEditable);
      if (block.children || !carriers.length) {
        blockSel.select(id);
      } else {
        // Same release rule as a canvas click on editable content: the caret
        // takes over, any explicit block selection lets go — a caret plus a
        // lingering block selection would read as both selected at once.
        blockSel.clear();
        focusEdge(id, "start");
      }
    },

    /** Move a block up/down by delta positions among its siblings. Caret and selection follow it. */
    moveBlock(id: string, delta: number) {
      const at = locate(id);
      if (!at) return;
      const j = at.index + delta;
      if (j < 0 || j >= at.list.length) return;
      const sel = captureSelection();
      const selected = blockSel.ids;
      commit(
        () => {
          at.list.splice(j, 0, at.list.splice(at.index, 1)[0]);
        },
        { label: `move ${id} ${delta > 0 ? "down" : "up"}` },
      );
      renderCanvas();
      if (sel) restoreSelection(sel);
      else if (selected.length === 1 && selected[0] === id) blockSel.select(id);
    },

    /**
     * Toggle an inline mark ("bold" | "italic") over the current selection in
     * a rich carrier. Pure model transform (src/format.ts) — one history
     * entry, block re-rendered in place, selection restored over the span.
     */
    format(mark: string) {
      const winSel = window.getSelection();
      if (!winSel?.rangeCount || winSel.isCollapsed) return;
      const range = winSel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el = node instanceof Element ? node : node.parentElement;
      const carrier = el?.closest<HTMLElement>("[data-pb-rich]");
      const block =
        carrier && canvas.contains(carrier) && carrier.isContentEditable ? blockAt(carrier) : null;
      if (!carrier || !block) return;
      const field = carrier.getAttribute("data-pb-rich")!;
      const result = toggleMark(carrier, range, mark);
      if (!result) return;
      commit(
        () => {
          block.fields[field] = result.html;
        },
        { label: `format ${mark} ${block.id}.${field}` },
      );
      rerenderBlock(block.id);
      const blockRoot = rootOf(block.id);
      const fresh =
        blockRoot &&
        scopedCarriers(blockRoot).find((c) => c.getAttribute("data-pb-rich") === field);
      if (fresh) selectItemRange(fresh, result.start, result.end);
    },

    /** {bold, italic} — true when the whole current selection carries the mark. Chrome binds button states to this. */
    formatState(): Record<string, boolean> {
      const winSel = window.getSelection();
      if (!winSel?.rangeCount) return formatState(null, null);
      const range = winSel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el = node instanceof Element ? node : node.parentElement;
      const carrier = el?.closest("[data-pb-rich]");
      if (!carrier || !canvas.contains(carrier)) return formatState(null, null);
      return formatState(carrier, range);
    },

    /**
     * Wrap the given blocks (default: the current block selection) in a fresh
     * `groupBlock` container — Cmd+G's primitive. Siblings only; returns the
     * wrapper, or null when grouping is unavailable or the ids straddle lists.
     */
    groupBlocks,

    /**
     * Unwrap the nearest container of `id` (default: selected block, else the
     * caret's block) — Shift+Cmd+G's primitive. Returns false when there is
     * no container in reach.
     */
    ungroupBlock,

    /** The block ungroupBlock(id) would unwrap, or null — chrome binds its Ungroup control to this. */
    ungroupTarget: (id?: string | null): string | null =>
      containerOf(id ?? blockSel.ids[0] ?? blockSel.state.active)?.id ?? null,

    /** Insert a fresh block of `type` at `index` (default: end). Inserter chrome's primitive. */
    insertBlock(type: string, index: number = model.blocks.length): Block | null {
      if (!getBlockType(type)) return null;
      const next = makeBlock(type);
      const i = Math.max(0, Math.min(index, model.blocks.length));
      commit(
        () => {
          model.blocks.splice(i, 0, next);
        },
        { label: `insert ${type}` },
      );
      renderCanvas();
      focusEdge(next.id, "start");
      ensureCanvasFocus();
      return next;
    },

    /**
     * Write one field on a block — the settings-control primitive. One
     * history entry per call (no coalescing: each pick is its own undo
     * step); the block re-renders in place with caret and block-selection
     * state preserved. No-ops on unknown blocks, fields the block's render
     * doesn't carry (an unreadable write would break the round-trip law),
     * and same-value writes.
     */
    setField(id: string, field: string, value: string) {
      const block = findBlock(id);
      const def = block && getBlockType(block.type);
      if (!def || !def.fields.some((f) => f.name === field)) return;
      if (block!.fields[field] === value) return;
      commit(
        () => {
          block!.fields[field] = value;
        },
        { label: `set ${id}.${field} = ${value}` },
      );
      rerenderBlock(id);
    },

    /**
     * Write one island-bound setting on a block — setField's sibling for
     * values with no DOM carrier (they live in the data-pb-settings island).
     * Sparse semantics: writing the declared default DELETES the key — the
     * model stores divergence only, defaults are the registry's to fill at
     * the render seam. Same history and re-render contract as setField.
     * No-ops on unknown blocks, settings the type doesn't declare (an
     * undeclared write would have no canonical carrier), values that aren't
     * plain JSON, and writes that don't change the effective value.
     */
    setSetting(id: string, name: string, value: unknown) {
      const block = findBlock(id);
      const def = block && getBlockType(block.type);
      const spec = def?.islandSettings.find((s) => s.name === name);
      const json = JSON.stringify(value) as string | undefined; // undefined on non-JSON values
      if (!block || !spec || json === undefined) return;
      const effective =
        block.settings && name in block.settings ? block.settings[name] : spec.default;
      if (json === JSON.stringify(effective)) return;
      commit(
        () => {
          block.settings ??= {};
          if (json === JSON.stringify(spec.default)) delete block.settings[name];
          else block.settings[name] = JSON.parse(json); // clone — the model never aliases caller objects
        },
        { label: `set ${id}.${name} = ${json}` },
      );
      rerenderBlock(id);
    },

    /**
     * Transform a block IN PLACE to another registered type — the element
     * switcher's primitive. Identity survives: same id, same position;
     * fields carry over by name where the target declares them (target
     * defaults fill the rest), authored classes ride along, children stay
     * when the target accepts them. Returns null (refuses) when the target
     * is unknown or already the block's type, on raw-html passthroughs
     * (nothing to carry), and when the block has children the target can't
     * take — that would silently drop content. Contrast replaceBlock: a
     * FRESH block of the new type (slash command / inserter semantics).
     */
    transformBlock(id: string, type: string): Block | null {
      const at = locate(id);
      const def = getBlockType(type);
      if (!at || !def || at.block.type === type || at.block.type === RAW_TYPE) return null;
      if (!slotAccepts(at.parent, type)) return null; // the containing slot rejects the target
      const src = at.block;
      if (src.children?.length && !def.acceptsChildren) return null;
      const next: Block = { type, id, fields: {}, classes: src.classes ?? "" };
      for (const f of def.fields) next.fields[f.name] = src.fields[f.name] ?? f.default;
      if (def.acceptsChildren) next.children = src.children ?? [];
      // Island settings carry over by name like fields do — sparse values the
      // target also declares survive, the rest stay at the target's defaults.
      if (def.islandSettings.length) {
        next.settings = {};
        for (const s of def.islandSettings) {
          if (src.settings && s.name in src.settings) next.settings[s.name] = src.settings[s.name];
        }
      }
      commit(
        () => {
          at.list.splice(at.index, 1, next);
        },
        { label: `transform ${id} → ${type}` },
      );
      // Surgical swap (same id): caret inside a preserved child and the
      // block-selection highlight both survive via rerenderBlock.
      rerenderBlock(id);
      return next;
    },

    /** Replace a block with a fresh one of another type (slash command / inserter). */
    replaceBlock(id: string, type: string): Block | null {
      const at = locate(id);
      if (!at || !getBlockType(type)) return null;
      if (!slotAccepts(at.parent, type)) return null; // the containing slot rejects the target
      const next = makeBlock(type);
      commit(
        () => {
          at.list.splice(at.index, 1, next);
        },
        { label: `transform ${id} → ${type}` },
      );
      renderCanvas();
      focusEdge(next.id, "start");
      ensureCanvasFocus();
      return next;
    },

    /** Replace a block's authored classes (canonical in the class attribute). */
    setClasses(id: string, classes: string | null | undefined) {
      const block = findBlock(id);
      if (!block) return;
      commit(
        () => {
          block.classes = classes ?? "";
        },
        { label: `classes ${id}` },
      );
      rerenderBlock(id);
    },

    loadHtml(html: string) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      // Content only — policy is config-sourced (thoughts/010), never read off
      // loaded HTML, so a pasted/AI-written block can't smuggle its own locks.
      model = upcast(tmp.querySelector("[data-pb-doc]") ?? tmp);
      history.reset();
      ghost = null; // ids ride the HTML — a stale ghost could shadow a loaded block
      renderCanvas();
      trace(`load: ${model.blocks.length} blocks · history reset`);
      notify();
    },

    /**
     * Model → HTML. Default pipeline "editor" = full wire contract;
     * { pipeline: "data" } = published shape (data-pb-* and settings islands
     * stripped, data-p-* kept).
     */
    serialize: (options?: { pipeline?: DowncastPipeline }): string =>
      downcast(model, options?.pipeline),
  };
}

/** The editor instance createEditor returns. */
export type Editor = ReturnType<typeof createEditor>;
