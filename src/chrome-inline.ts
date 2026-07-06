// chrome-inline.ts — the DEFAULT in-canvas UI, batteries included (story
// #313). The core stays headless: nothing here runs unless the host calls
// attachInlineChrome(editor), and bundlers tree-shake the whole module when
// it goes unused. Hosts that want their own UI import just the core.
//
// What attaches, per editor instance (N instances on a page never cross):
// - "/" in an empty default block → quick block picker (flat list)
// - the empty default block's ghost row carries the inline + → the block
//   INSERTER (search + grid)
// - the floating block toolbar: block indicator, move up/down, an alignment
//   DROPDOWN, bold/italic, and a ⋮ menu (Ungroup) — dropdowns over inline
//   buttons on purpose: the toolbar will grow. A multi-selection swaps the
//   whole strip for the Group action.
//
// Styling is Tailwind utilities written as literals below — chrome.css
// (imported here) compiles them into dist/publr-editor.css, the lib's one
// CSS artifact. The look is Gutenberg-brutalist: white, hard 1px zinc-900
// border, 2px corners, full-height segment dividers, black active states,
// one blue accent (--color-pbe-accent) for focus/active rings.
//
// Two behavioral laws carried over from the demos (both were re-discovered
// the hard way — see story #313):
// - The slash check rides MODEL changes only, never selectionchange: an
//   Escape-refocused caret sitting in a block that still reads "/" must not
//   reopen the menu it just closed.
// - Chrome swallows mousedown (except the inserter's search field) so
//   clicking a control never blurs the carrier or collapses the text
//   selection it is about to act on.

import { effect } from "../vendor/publr/publr.js";
import type { Editor } from "./editor";
import { blockTypes, getBlockType } from "./registry";
import { locateBlock } from "./tree";
// The stylesheet behind the class literals below. The lib build extracts it
// into dist/publr-editor.css (the emitted JS carries no CSS import).
import "./chrome.css";

export interface InlineChromeOptions {
  /**
   * Positioned ancestor the floating UI parks in (defaults to the canvas's
   * parent; given position:relative when static).
   */
  container?: HTMLElement;
  /** "/" quick picker (default true). */
  slash?: boolean;
  /** Inline + inserter on the empty default block's ghost row (default true). */
  inserter?: boolean;
  /**
   * Renders a "Browse all" footer in the + inserter panel — the escalation
   * slot for hosts that have a bigger block library (the demo shell opens
   * its library rail). Called with the block the panel targeted, which the
   * host should treat as the insertion anchor (Gutenberg semantics: an empty
   * default block gets REPLACED by the eventual pick).
   */
  onBrowseAll?: (targetId: string | null) => void;
  /** Floating block toolbar (default true). */
  toolbar?: boolean;
}

// --- class vocabulary (literals — the Tailwind scanner reads this file) ------

const BTN =
  "flex h-9 min-w-9 cursor-pointer items-center justify-center gap-0.5 rounded-[1px] px-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-pbe-accent)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";
const SEGMENT = "flex items-stretch gap-0.5 border-r border-zinc-900 p-1 last:border-r-0";
const PANEL =
  "pbe-ui absolute z-40 min-w-56 rounded-[2px] border border-zinc-900 bg-white p-1.5 shadow-[0_6px_16px_rgb(0_0_0/0.12)]";
const PANEL_LABEL =
  "block px-2 py-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase";
const ITEM =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-[1px] px-2.5 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-pbe-accent)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";
// The current choice inside a menu (e.g. the active alignment) — the same
// accent ring the screenshot shows on Gutenberg's selected item.
const ITEM_ACTIVE = "shadow-[inset_0_0_0_1.5px_var(--color-pbe-accent)]";
// A toggled-on toolbar button (bold while bold): Gutenberg's black fill.
// Conflicting utilities SWAP, never stack (same layer + specificity means
// stylesheet order would decide, and text-zinc-900 happens to out-sort
// text-white) — the on-state removes the base color/hover classes.
const BTN_ON = ["bg-zinc-900", "text-white", "hover:bg-zinc-800"];
const BTN_ON_SWAPS = ["text-zinc-900", "hover:bg-zinc-100"];

// --- icons -------------------------------------------------------------------

const svg = (inner: string, cls = "h-6 w-6") =>
  `<svg class="${cls} fill-current" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const stroke = (paths: string) =>
  `<svg class="h-[15px] w-[15px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">${paths}</svg>`;
const line = (d: string) =>
  `<path d="${d}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;

const ICON_UP = svg('<path d="M6.5 12.4 12 8l5.5 4.4-.9 1.2L12 10l-4.6 3.6-.9-1.2Z"/>');
const ICON_DOWN = svg('<path d="M17.5 11.6 12 16l-5.5-4.4.9-1.2L12 14l4.6-3.6.9 1.2Z"/>');
const ICON_CHEVRON = svg(
  '<path d="M17.5 11.6 12 16l-5.5-4.4.9-1.2L12 14l4.6-3.6.9 1.2Z"/>',
  "h-4 w-4",
);
const ICON_MORE = svg(
  '<circle cx="12" cy="5.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18.5" r="1.5"/>',
);
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_GROUP = stroke(
  `<rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2"/>${line("M8 5.5v5")}${line("M5.5 8h5")}`,
);
const ICON_UNGROUP = stroke(
  `<rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2"/>${line("M5.5 8h5")}`,
);

const ALIGNMENTS = [
  {
    key: "left",
    label: "Align text left",
    icon: stroke(line("M1 3.5h14") + line("M1 8h8") + line("M1 12.5h11")),
  },
  {
    key: "center",
    label: "Align text center",
    icon: stroke(line("M1 3.5h14") + line("M4 8h8") + line("M2.5 12.5h11")),
  },
  {
    key: "right",
    label: "Align text right",
    icon: stroke(line("M1 3.5h14") + line("M7 8h8") + line("M4 12.5h11")),
  },
];
const ALIGN_CLASSES = ALIGNMENTS.map((a) => `text-${a.key}`);

// Block badges for the picker/inserter/indicator. The registry declares no
// icon metadata (yet) — known core types get glyphs, the rest their initial.
const BADGES: Record<string, string> = {
  paragraph: "¶",
  heading: "H",
  quote: "❝",
  group: "▣",
};
const badgeOf = (type: string) => BADGES[type] ?? (type[0] ?? "?").toUpperCase();

// --- small DOM helpers ---------------------------------------------------------

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html != null) el.innerHTML = html;
  return el;
}

function button(className: string, html: string, title?: string): HTMLButtonElement {
  const b = h("button", className, html);
  b.type = "button";
  if (title) {
    b.title = title;
    b.setAttribute("aria-label", title);
  }
  return b;
}

const setOn = (btn: HTMLButtonElement, on: boolean) => {
  BTN_ON.forEach((c) => btn.classList.toggle(c, on));
  BTN_ON_SWAPS.forEach((c) => btn.classList.toggle(c, !on));
};

/**
 * Attach the default in-canvas UI to an editor instance. Everything is
 * scoped to that instance; returns a detach function that removes the UI and
 * all document-level listeners.
 */
export function attachInlineChrome(editor: Editor, options: InlineChromeOptions = {}): () => void {
  const withSlash = options.slash ?? true;
  const withInserter = options.inserter ?? true;
  const withToolbar = options.toolbar ?? true;

  const canvas = editor.canvas;
  const host = options.container ?? canvas.parentElement;
  if (!host) throw new Error("PublrEditor: attachInlineChrome needs a positioned container");
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  canvas.classList.add("pbe-canvas"); // scope hook for the shipped canvas-owned CSS

  let detached = false;
  const disposers: (() => void)[] = [];
  const mounted: HTMLElement[] = [];
  const mount = <T extends HTMLElement>(el: T): T => {
    host.appendChild(el);
    mounted.push(el);
    return el;
  };
  const listen = <K extends keyof DocumentEventMap>(
    type: K,
    fn: (e: DocumentEventMap[K]) => void,
  ) => {
    document.addEventListener(type, fn);
    disposers.push(() => document.removeEventListener(type, fn));
  };

  const rootOf = (id: string) =>
    canvas.querySelector<HTMLElement>(`[data-pb-id="${CSS.escape(id)}"]`);

  const plainText = (html: string | undefined): string => {
    const d = document.createElement("div");
    d.innerHTML = html ?? "";
    return d.textContent ?? "";
  };

  // Escape from a block-anchored panel: put the caret back at the end.
  const refocusCarrier = (id: string) => {
    const root = rootOf(id);
    const carrier =
      root &&
      (root.matches("[data-pb-rich],[data-pb-text]")
        ? root
        : root.querySelector<HTMLElement>("[data-pb-rich],[data-pb-text]"));
    if (!carrier) return;
    carrier.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(carrier);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // Park `el` against the host at viewport coords (top/left in px).
  const park = (el: HTMLElement, top: number, left: number) => {
    const fr = host.getBoundingClientRect();
    el.style.top = `${top - fr.top}px`;
    el.style.left = `${Math.max(0, left - fr.left)}px`;
  };

  // Linear keyboard nav shared by every menu-shaped panel.
  const wireMenuKeys = (panel: HTMLElement, onEscape: () => void) =>
    panel.addEventListener("keydown", (e) => {
      const items = [...panel.querySelectorAll<HTMLButtonElement>("button:not([hidden])")].filter(
        (b) => !b.disabled,
      );
      const cur = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next =
          e.key === "ArrowDown"
            ? cur < items.length - 1
              ? cur + 1
              : 0
            : cur > 0
              ? cur - 1
              : items.length - 1;
        items[next]?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      }
    });

  // ONE floating surface open at a time, across all parts of this instance.
  type Panel = { el: HTMLElement; onClose?: () => void };
  let openPanel: Panel | null = null;
  function showPanel(p: Panel) {
    closePanel();
    openPanel = p;
    p.el.hidden = false;
  }
  function closePanel() {
    if (!openPanel) return;
    const p = openPanel;
    openPanel = null;
    p.el.hidden = true;
    p.onClose?.();
  }

  // The block an open picker/inserter targets — picking TRANSFORMS it
  // (Gutenberg semantics: replace the empty/"/" default block).
  let targetId: string | null = null;

  const pickBlock = (type: string) => {
    const id = targetId;
    targetId = null;
    closePanel();
    if (id && editor.getBlock(id)) editor.replaceBlock(id, type); // focuses the fresh block
  };

  // ---------------------------------------------------------------------------
  // "/" quick picker
  // ---------------------------------------------------------------------------

  const quick = withSlash ? mount(h("div", `${PANEL} pbe-quick`)) : null;
  if (quick) {
    quick.hidden = true;
    quick.setAttribute("role", "menu");
    quick.addEventListener("mousedown", (e) => e.preventDefault());
    quick.addEventListener("click", (e) => {
      const item =
        e.target instanceof Element
          ? e.target.closest<HTMLButtonElement>("button[data-type]")
          : null;
      if (item) pickBlock(item.dataset.type!);
    });
    wireMenuKeys(quick, () => {
      const id = targetId;
      targetId = null;
      closePanel();
      if (id) refocusCarrier(id);
    });
  }

  function openQuick(id: string) {
    const root = quick && rootOf(id);
    if (!quick || !root) return;
    targetId = id;
    quick.textContent = "";
    quick.appendChild(h("span", PANEL_LABEL, "Blocks"));
    for (const b of blockTypes()) {
      const item = button(ITEM, "", undefined);
      item.dataset.type = b.type;
      item.setAttribute("role", "menuitem");
      item.append(
        h("span", "flex h-5 w-5 items-center justify-center font-bold", badgeOf(b.type)),
        b.label,
      );
      quick.appendChild(item);
    }
    const rr = root.getBoundingClientRect();
    park(quick, rr.bottom + 6, rr.left);
    showPanel({ el: quick });
    quick.querySelector("button")?.focus();
  }

  // ---------------------------------------------------------------------------
  // + appender → block inserter (search + grid)
  // ---------------------------------------------------------------------------

  const inserter = withInserter
    ? mount(
        h(
          "div",
          "pbe-ui pbe-inserter absolute z-40 w-[300px] overflow-hidden rounded-[2px] border border-zinc-900 bg-white shadow-[0_6px_16px_rgb(0_0_0/0.12)]",
        ),
      )
    : null;
  const search = h(
    "input",
    "pbe-search m-3 mb-1 block w-[calc(100%-24px)] rounded-[1px] border border-zinc-400 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-pbe-accent focus:shadow-[0_0_0_1px_var(--color-pbe-accent)] focus:outline-none",
  );
  const grid = h("div", "pbe-grid grid grid-cols-3 gap-1 px-2 pt-2 pb-3");
  const noResults = h(
    "div",
    "pbe-noresults px-3 pt-1 pb-4 text-center text-[13px] text-zinc-500",
    "No blocks found",
  );
  const browseAll = options.onBrowseAll
    ? button(
        "pbe-browseall block w-full cursor-pointer border-t border-zinc-900 bg-zinc-900 p-3 text-center text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1.5px_var(--color-pbe-accent)]",
        "Browse all",
      )
    : null;
  const appender = mount(
    button(
      "pbe-ui pbe-appender absolute z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[2px] bg-zinc-900 text-white hover:bg-zinc-700",
      ICON_PLUS,
      "Add block",
    ),
  );
  appender.hidden = true;

  if (inserter) {
    inserter.hidden = true;
    search.type = "text";
    search.placeholder = "Search";
    search.autocomplete = "off";
    search.setAttribute("aria-label", "Search for blocks");
    noResults.hidden = true;
    inserter.append(search, grid, noResults);
    if (browseAll) {
      inserter.append(browseAll);
      browseAll.addEventListener("click", () => {
        const id = targetId;
        targetId = null;
        closePanel();
        options.onBrowseAll!(id);
      });
    }

    const gridItems = () => [...grid.querySelectorAll<HTMLButtonElement>("button[data-type]")];
    const visibleItems = () => gridItems().filter((el) => !el.hidden);
    const filterGrid = () => {
      const q = search.value.trim().toLowerCase();
      for (const el of gridItems())
        el.hidden = !!q && !el.dataset.type!.includes(q) && !el.dataset.label!.includes(q);
      noResults.hidden = visibleItems().length > 0;
    };

    search.addEventListener("input", filterGrid);
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = visibleItems()[0];
        if (first) pickBlock(first.dataset.type!);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        visibleItems()[0]?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const id = targetId;
        targetId = null;
        closePanel();
        if (id) refocusCarrier(id);
      }
    });
    grid.addEventListener("click", (e) => {
      const item =
        e.target instanceof Element
          ? e.target.closest<HTMLButtonElement>("button[data-type]")
          : null;
      if (item) pickBlock(item.dataset.type!);
    });
    grid.addEventListener("keydown", (e) => {
      const items = visibleItems();
      const cur = items.indexOf(document.activeElement as HTMLButtonElement);
      const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
      if (keys.includes(e.key)) {
        e.preventDefault();
        const fwd = e.key === "ArrowDown" || e.key === "ArrowRight";
        if (fwd) items[cur < items.length - 1 ? cur + 1 : 0]?.focus();
        else if (cur > 0) items[cur - 1].focus();
        else search.focus(); // past the top: back to the search box
      } else if (e.key === "Escape") {
        e.preventDefault();
        const id = targetId;
        targetId = null;
        closePanel();
        if (id) refocusCarrier(id);
      }
    });

    appender.addEventListener("mousedown", (e) => e.preventDefault());
    appender.addEventListener("click", () => {
      const id = appender.dataset.target;
      if (!id || !editor.getBlock(id)) return;
      targetId = id;
      search.value = "";
      grid.textContent = "";
      for (const b of blockTypes()) {
        const item = button(
          "flex cursor-pointer flex-col items-center gap-2 rounded-[1px] px-1 pt-3.5 pb-2.5 text-[13px] font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none",
          "",
        );
        item.dataset.type = b.type;
        item.dataset.label = b.label.toLowerCase();
        item.append(h("span", "text-lg leading-none font-bold", badgeOf(b.type)), b.label);
        grid.appendChild(item);
      }
      noResults.hidden = true;
      const ar = appender.getBoundingClientRect();
      const fr = host.getBoundingClientRect();
      inserter.hidden = false; // measurable before parking
      inserter.style.top = `${ar.bottom - fr.top + 6}px`;
      inserter.style.left = `${Math.max(0, ar.right - fr.left - inserter.offsetWidth)}px`;
      showPanel({ el: inserter });
      search.focus();
    });
  }

  // ---------------------------------------------------------------------------
  // floating block toolbar
  // ---------------------------------------------------------------------------

  const toolbar = withToolbar
    ? mount(
        h(
          "div",
          "pbe-ui pbe-toolbar absolute z-30 flex -translate-y-[calc(100%+10px)] items-stretch rounded-[2px] border border-zinc-900 bg-white shadow-[0_2px_6px_rgb(0_0_0/0.06)]",
        ),
      )
    : null;

  // built below when withToolbar; declared here so syncs can reference them
  let indicator!: HTMLElement;
  let btnUp!: HTMLButtonElement;
  let btnDown!: HTMLButtonElement;
  let alignTrigger!: HTMLButtonElement;
  let alignPanel!: HTMLElement;
  let btnBold!: HTMLButtonElement;
  let btnItalic!: HTMLButtonElement;
  let moreTrigger!: HTMLButtonElement;
  let morePanel!: HTMLElement;
  let itemUngroup!: HTMLButtonElement;
  let singleStrip!: HTMLElement;
  let multiStrip!: HTMLElement;
  let toolbarId: string | null = null; // the block the toolbar currently rides

  if (toolbar) {
    toolbar.hidden = true;
    toolbar.addEventListener("mousedown", (e) => e.preventDefault());

    singleStrip = h("div", "pbe-ui flex items-stretch");
    multiStrip = h("div", "pbe-ui flex items-stretch");
    toolbar.append(singleStrip, multiStrip);

    // segment 1: block indicator + movers
    const seg1 = h("div", SEGMENT);
    indicator = h(
      "span",
      "flex h-9 min-w-9 items-center justify-center px-1 text-[15px] font-bold text-zinc-900",
    );
    btnUp = button(BTN, ICON_UP, "Move up");
    btnDown = button(BTN, ICON_DOWN, "Move down");
    btnUp.addEventListener("click", () => toolbarId && editor.moveBlock(toolbarId, -1));
    btnDown.addEventListener("click", () => toolbarId && editor.moveBlock(toolbarId, 1));
    seg1.append(indicator, btnUp, btnDown);

    // segment 2: alignment dropdown
    const seg2 = h("div", SEGMENT);
    alignTrigger = button(BTN, ALIGNMENTS[0].icon + ICON_CHEVRON, "Align text");
    alignTrigger.setAttribute("aria-haspopup", "menu");
    alignTrigger.setAttribute("aria-expanded", "false");
    seg2.append(alignTrigger);
    alignPanel = mount(h("div", `${PANEL} pbe-align`));
    alignPanel.hidden = true;
    alignPanel.setAttribute("role", "menu");

    // segment 3: inline formats
    const seg3 = h("div", SEGMENT);
    btnBold = button(BTN, "<b>B</b>", "Bold");
    btnItalic = button(BTN, "<i>I</i>", "Italic");
    const fmt = (cmd: string) => {
      editor.format(cmd);
      syncToolbar();
    };
    btnBold.addEventListener("click", () => fmt("bold"));
    btnItalic.addEventListener("click", () => fmt("italic"));
    seg3.append(btnBold, btnItalic);

    // segment 4: ⋮ options menu — the growth point for future block actions
    const seg4 = h("div", SEGMENT);
    moreTrigger = button(BTN, ICON_MORE, "Options");
    moreTrigger.setAttribute("aria-haspopup", "menu");
    moreTrigger.setAttribute("aria-expanded", "false");
    seg4.append(moreTrigger);
    morePanel = mount(h("div", `${PANEL} pbe-more`));
    morePanel.hidden = true;
    morePanel.setAttribute("role", "menu");
    itemUngroup = button(ITEM, "", "Ungroup (⇧⌘G)");
    itemUngroup.setAttribute("role", "menuitem");
    itemUngroup.append(
      h("span", "flex h-5 w-5 items-center justify-center", ICON_UNGROUP),
      "Ungroup",
    );
    itemUngroup.addEventListener("click", () => {
      closePanel();
      editor.ungroupBlock(toolbarId ?? undefined);
    });
    morePanel.append(itemUngroup);

    singleStrip.append(seg1, seg2, seg3, seg4);

    // multi-selection strip: the Group action
    const segMulti = h("div", SEGMENT);
    const btnGroup = button(`${BTN} px-2`, "", "Group (⌘G)");
    btnGroup.append(h("span", "flex h-5 w-5 items-center justify-center", ICON_GROUP), "Group");
    btnGroup.addEventListener("click", () => void editor.groupBlocks());
    segMulti.append(btnGroup);
    multiStrip.append(segMulti);

    // dropdown plumbing: panels swallow mousedown (the carrier/selection must
    // survive), Escape returns focus to the trigger
    for (const [trigger, panel] of [
      [alignTrigger, alignPanel],
      [moreTrigger, morePanel],
    ] as const) {
      panel.addEventListener("mousedown", (e) => e.preventDefault());
      wireMenuKeys(panel, () => {
        closePanel();
        trigger.focus();
      });
      trigger.addEventListener("click", () => {
        if (openPanel?.el === panel) {
          closePanel();
          return;
        }
        if (panel === alignPanel) buildAlignMenu();
        const tr = trigger.getBoundingClientRect();
        park(panel, tr.bottom + 6, tr.left);
        showPanel({ el: panel, onClose: () => trigger.setAttribute("aria-expanded", "false") });
        trigger.setAttribute("aria-expanded", "true");
        panel.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
      });
    }

    // Escape anywhere in the strip: caret back into the block.
    toolbar.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !openPanel && toolbarId) refocusCarrier(toolbarId);
    });
  }

  const currentAlign = (): string | null => {
    const block = toolbarId ? editor.getBlock(toolbarId) : null;
    return (
      (block?.classes ?? "")
        .split(/\s+/)
        .find((c) => ALIGN_CLASSES.includes(c))
        ?.slice(5) ?? null
    );
  };

  function buildAlignMenu() {
    const active = currentAlign();
    alignPanel.textContent = "";
    for (const a of ALIGNMENTS) {
      const item = button(`${ITEM}${a.key === active ? ` ${ITEM_ACTIVE}` : ""}`, "");
      item.setAttribute("role", "menuitem");
      item.append(h("span", "flex h-5 w-5 items-center justify-center", a.icon), a.label);
      item.addEventListener("click", () => {
        closePanel();
        const id = toolbarId;
        const block = id ? editor.getBlock(id) : null;
        if (!id || !block) return;
        const rest = (block.classes ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .filter((c) => !ALIGN_CLASSES.includes(c));
        // re-pick the active alignment = back to default; alignment rides the
        // wire as AUTHORED CLASSES
        editor.setClasses(id, (a.key === active ? rest : [...rest, `text-${a.key}`]).join(" "));
        // the panel held focus while open — hand the caret back or the
        // toolbar loses its block and hides itself
        refocusCarrier(id);
      });
      alignPanel.appendChild(item);
    }
  }

  function syncToolbar() {
    if (!toolbar) return;
    // While chrome holds focus (open dropdown, tabbed-to button) the caret is
    // gone but the toolbar must not vanish under the user.
    if (openPanel || toolbar.contains(document.activeElement)) return;

    const ids = editor.selection.blocks;
    const multi = ids.length > 1;
    const id = multi ? ids[0] : (editor.selection.active ?? ids[0] ?? null);
    const block = id ? editor.getBlock(id) : null;
    const root = id ? rootOf(id) : null;
    if (!id || !block || !root) {
      toolbar.hidden = true;
      toolbarId = null;
      return;
    }
    toolbarId = multi ? null : id;
    singleStrip.hidden = multi;
    multiStrip.hidden = !multi;

    if (!multi) {
      indicator.textContent = badgeOf(block.type);
      indicator.title = blockTypes().find((b) => b.type === block.type)?.label ?? block.type;

      const at = locateBlock(editor.getModel().blocks, id);
      btnUp.disabled = !at || at.index <= 0;
      btnDown.disabled = !at || at.index >= at.list.length - 1;

      const isRaw = block.type === "raw-html";
      // a container's rich carriers belong to its CHILDREN — formatting
      // targets those blocks, not the container
      const hasRich =
        !isRaw &&
        !block.children &&
        (root.matches("[data-pb-rich]") || !!root.querySelector("[data-pb-rich]"));
      const marks = editor.formatState();
      btnBold.disabled = btnItalic.disabled = !hasRich;
      setOn(btnBold, !!marks.bold);
      setOn(btnItalic, !!marks.italic);

      alignTrigger.disabled = isRaw;
      const align = ALIGNMENTS.find((a) => a.key === currentAlign()) ?? ALIGNMENTS[0];
      alignTrigger.innerHTML = align.icon + ICON_CHEVRON;

      itemUngroup.disabled = !editor.ungroupTarget(id);
    }

    const rr = root.getBoundingClientRect();
    park(toolbar, rr.top, rr.left); // the translate lifts it above the block
    toolbar.hidden = false;
  }

  // ---------------------------------------------------------------------------
  // syncs + wiring
  // ---------------------------------------------------------------------------

  // "/" rides MODEL changes only (see the header note).
  function syncSlash() {
    if (!withSlash || openPanel) return;
    const id = editor.selection.active;
    const block = id ? editor.getBlock(id) : null;
    if (!id || !block || block.type !== editor.defaultBlock) return;
    const field = getBlockType(block.type)?.fields.find(
      (f) => f.type === "rich" || f.type === "text",
    );
    if (field && plainText(block.fields[field.name]).trim() === "/") openQuick(id);
  }

  // The + follows the empty default block's ghost row.
  function syncAppender() {
    if (!withInserter || openPanel) return;
    const id = editor.selection.active;
    const block = id ? editor.getBlock(id) : null;
    const root = id ? rootOf(id) : null;
    const ghosted =
      root &&
      (root.matches("[data-pbe-ph].pbe-empty")
        ? root
        : root.querySelector("[data-pbe-ph].pbe-empty"));
    if (!id || !block || !root || block.type !== editor.defaultBlock || !ghosted) {
      appender.hidden = true;
      return;
    }
    const cr = canvas.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    appender.dataset.target = id;
    park(appender, rr.top + (rr.height - 32) / 2, cr.right - 40);
    appender.hidden = false;
  }

  // Click anywhere outside an open panel dismisses it.
  listen("mousedown", (e) => {
    if (!openPanel || !(e.target instanceof Node)) return;
    if (!openPanel.el.contains(e.target)) closePanel();
  });

  // Caret movement WITHIN a block changes mark states and the +'s row without
  // any store change. Cheap when another instance owns the caret: active=null.
  listen("selectionchange", () => {
    if (detached) return;
    syncAppender();
    syncToolbar();
  });

  const unsubscribe = editor.subscribe(() => {
    if (detached) return;
    syncSlash();
    syncAppender();
    syncToolbar();
  });
  disposers.push(unsubscribe);

  // Block-selection changes (cmd+click, Escape, drag promotion) ride the
  // editor's reactive selection store.
  effect(() => {
    if (detached) return;
    syncToolbar();
  });

  return function detach() {
    detached = true;
    closePanel();
    disposers.forEach((d) => d());
    mounted.forEach((el) => el.remove());
    canvas.classList.remove("pbe-canvas");
  };
}
