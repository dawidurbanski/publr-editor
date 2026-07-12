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
import { probeWasmCssEngine } from "./wasm-engine";
import preflightCss from "../vendor/jit/preflight.css?raw";
import { registerCoreBlocks, registerCorePatterns } from "./blocks";
import { registerHomepagePatterns } from "./blocks/homepage-patterns";
import { Publr, effect } from "../vendor/publr/publr.js";
import { position } from "../vendor/publr/publr-position.js";
import "./styles.css";

const {
  createEditor,
  attachInlineChrome,
  blockTypes,
  getBlockType,
  DECORATIONS,
  LETTER_CASES,
  TEXT_ALIGNMENTS,
  FONT_WEIGHTS,
  FONT_STYLES,
  FLEX_WRAPS,
  JUSTIFY_CONTENT,
  ALIGN_ITEMS,
  BORDER_STYLES,
  blockSupportsStyle,
  DEFAULT_THEME,
  activeTheme,
  setActiveTheme,
  themeFromTokens,
  themeFromCssText,
  themeToCssText,
  fontSizes,
  colors,
  radii,
  leadings,
  trackings,
  spacingBase,
  SPACING_STEPS,
  BORDER_WIDTH_STEPS,
  inlineBackend,
  probeCssEngine,
  collectClasses,
  unresolvedUtilities,
  getPattern,
  patternTypes,
  publishPattern,
  PATTERN_ROOT_TYPE,
  locateBlock,
  pathToBlock,
  flattenBlocks,
  iconRef,
  mountIconSprite,
  upcast,
  downcast,
} = PublrEditor;
type Block = PublrEditor.Block;
type FieldValue = PublrEditor.FieldValue;
type ColorOption = PublrEditor.ColorOption;

// Fixtures the ?fixture= URL can seed the shell from, inlined at build time
// (same glob the manual harness uses — src/manual.ts). A build-time import is
// the point: fetching /tests/manual/<id>.md raw only works under `vp dev` and
// 404s on the deployed static demo, where tests/ is not shipped.
const fixtureFiles = import.meta.glob("../tests/manual/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

// --- the demo SITE THEME (E1) -----------------------------------------------
//
// A site curates its theme; the full Tailwind default is what you start FROM.
// This one picks a subset of the default (values stay 1:1 — picked, not
// copied) plus one custom token, `color-brand`, which is also declared in
// styles.css's @theme so the demo's build-time Tailwind resolves the brand
// utilities (the wasm engine takes over that job in E3). Style controls
// derive their options from THIS document — add a token here (or via a
// fixture's theme fence) and the matching control grows.
const DEMO_PICK = new Set([
  "spacing",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "color-white",
  "color-neutral-100",
  "color-neutral-500",
  "color-neutral-900",
  "color-amber-300",
  "radius-sm",
  "radius-md",
  "radius-lg",
  "radius-xl",
  "leading-tight",
  "leading-normal",
  "leading-relaxed",
  "tracking-tight",
  "tracking-normal",
  "tracking-wide",
]);
const DEMO_THEME: PublrEditor.Theme = {
  tokens: [
    ...DEFAULT_THEME.tokens.filter((t) => DEMO_PICK.has(t.name)),
    { name: "color-brand", value: "#3858e9" },
  ],
};

// --- style backend switch + CSS engine (E2a / E3) ----------------------------
//
// ?inline runs the demo on the INLINE backend: lens writes go to the style
// attribute as var(--token) declarations, and the theme's :root variables are
// injected below — zero Tailwind involved (pasted utility classes stay
// opaque, exactly the documented boundary).
//
// The default (classes) backend probes the dev jit bridge (/__jit) once: when
// the native jit answers, the canvas's live class universe is compiled on
// every change and injected as ONE stylesheet — arbitrary values and custom
// tokens included. No bridge → build-time safelist CSS only (presets render,
// customs don't), and chrome states say so instead of half-working.
const INLINE_MODE = new URLSearchParams(location.search).has("inline");
const inlineThemeTag = document.createElement("style");
inlineThemeTag.id = "pbe-inline-theme";
const engineTag = document.createElement("style");
engineTag.id = "pbe-engine-css";
let cssEngine: PublrEditor.CssEngine | null = null;

function refreshInlineThemeCss(): void {
  if (INLINE_MODE) inlineThemeTag.textContent = inlineBackend.css?.() ?? "";
}
// The editor API is already at window.Publr.Editor (attached by the entry
// module — one global namespace, owned by PublrJS, which is a dependency
// anyway). The demo only adds its instance below as Publr.editor.

// Core blocks live in src/blocks/ — one file per block, registered through
// the same public API a plugin would use. Patterns register second: their
// fragments validate against the block registry.
registerCoreBlocks();
registerCorePatterns();
// The Tailwind Plus homepage, sliced into per-section patterns (demo showcase
// of Phase B patterns over real content — see poc-homepage fixture).
registerHomepagePatterns();

// /media/* uploads (OPFS + service worker). `mediaReady` gates the media
// control's upload affordance — URL input works regardless.
let mediaUploadsAvailable = false;
const mediaReady = PublrEditor.registerMediaWorker().then((reg) => {
  mediaUploadsAvailable = !!reg;
  return !!reg;
});

// Icons come from the registry (def.icon → sprite ref); blocks that declare
// none fall back to a letter badge. raw-html has no definition — special-cased
// onto the set's "html" icon.

// Dataset payload handed to actions by data-p-on ({ ...el.dataset }).
type Dataset = { [key: string]: string | undefined };

// --- pattern previews ---------------------------------------------------------
//
// A preview is the pattern's fragment run through the SAME cast pipeline a
// document uses (upcast → downcast: baseline classes, islands, defaults all
// applied), rendered at a fixed authoring width and scaled down to the card.
// Cached per pattern — registrations are static within a page session.

// The demo canvas column is max-w-[660px] with px-5 padding — blocks lay out
// at 620px. Previews use the SAME content width, so the card shows exactly
// what an insert will look like.
const PREVIEW_WIDTH = 620;

const previewCache = new Map<string, string>();
function patternPreviewHtml(name: string): string {
  let html = previewCache.get(name);
  if (html == null) {
    const tmp = document.createElement("div");
    tmp.innerHTML = getPattern(name)?.content ?? "";
    html = downcast(upcast(tmp));
    previewCache.set(name, html);
  }
  return html;
}

// Fill every empty preview shell in the document (flyout + explorer share the
// same data-pattern-preview vocabulary). Cards keep their own copy — filled
// once, keyed rows survive list re-derivations untouched.
function fillPatternPreviews(): void {
  for (const holder of document.querySelectorAll<HTMLElement>("[data-pattern-preview]")) {
    if (holder.dataset.filled) continue;
    const name = holder.dataset.patternPreview;
    if (!name || !holder.clientWidth) continue; // hidden panes measure 0 — fill on next open
    holder.dataset.filled = "1";
    const inner = document.createElement("div");
    // pbe-preview re-scopes the canvas-owned layout rules (styles.css) onto
    // the card; the wrap's typography context is mirrored inline, and
    // flow-root keeps the fragment's own top/bottom margins inside the
    // measured box instead of collapsing out of it.
    inner.className = "pbe-preview";
    inner.style.width = `${PREVIEW_WIDTH}px`;
    inner.style.transformOrigin = "top left";
    inner.style.pointerEvents = "none";
    // A preview is a PICTURE: its links/buttons must never become tab stops —
    // the card's pick button is the ONE focusable piece per pattern.
    inner.inert = true;
    inner.style.fontSize = "15px";
    inner.style.lineHeight = "1.6";
    inner.style.display = "flow-root";
    inner.innerHTML = patternPreviewHtml(name);
    // the canvas stamps pbe-container (8px block margin) on every container
    // at render time — previews must carry the same layout class
    for (const el of inner.querySelectorAll("[data-pb-children]"))
      el.classList.add("pbe-container");
    holder.textContent = "";
    holder.appendChild(inner);
    const scale = holder.clientWidth / PREVIEW_WIDTH;
    inner.style.transform = `scale(${scale})`;
    holder.style.height = `${Math.max(48, Math.ceil(inner.scrollHeight * scale))}px`;
  }
}

// --- pattern content model ------------------------------------------------------
//
// Inside the MAIN editor a pattern instance is a CONTENT-EDITING surface
// (thoughts/012): only content-bearing blocks are surfaced —
// layout containers (tag-only fields) and invisible utility blocks (spacer,
// separator) stay out of sight, and a content block is the editable UNIT
// (no descending into a cover's innards). The full structure is Edit
// pattern's isolation editor's business.

const { patternContentBlocks } = PublrEditor;

/** One option button inside a rendered setting control. */
/** One color swatch: key = the STORED value (token key, "red-500"); css = the
 * token's raw value (fills the swatch). */
interface Swatch {
  key: string;
  css: string;
  label: string;
  pressed: boolean;
}

/** One palette family row for the grid form (big palettes: 22 families × 11). */
interface SwatchFamily {
  family: string;
  swatches: Swatch[];
}

/** A color control row (text / background / border color). Flat swatch row for
 * curated palettes; family grid when the palette is big. */
interface ColorRow {
  prop: string;
  label: string;
  value: string; // current token key, "" = unset
  grid: boolean;
  swatches: Swatch[];
  families: SwatchFamily[];
}

/** A scale control row. Segmented toggle-group normally; a <select> when the
 * scale outgrows segments (the Tailwind default has 13 font sizes). */
interface ScaleRow {
  prop: string;
  label: string;
  options: { key: string; label: string; pressed: boolean }[];
  isSelect: boolean;
  isRange: boolean;
  isSegmented: boolean;
  rangeIndex: number;
  rangeMax: number;
  value: string; // select binding; "" = unset
  allowCustom: boolean;
  showCustomDisclosure: boolean;
}

interface OptionalStyleControl {
  prop: string;
  label: string;
  enabled: boolean;
}

/** One token row in the Design tab (E4). */
interface DesignRow {
  name: string; // full token name (text-lg)
  key: string; // the scale key (lg)
  value: string;
  isColor: boolean; // renders a swatch preview next to the value input
}

/** One namespace section in the Design tab. */
interface DesignSection {
  ns: string;
  label: string;
  rows: DesignRow[];
}

interface SettingOptionRow {
  value: string;
  label: string;
  icon: string; // sprite ref ("#pbe-i-…") — "" renders the label as text
  pressed: boolean; // the block's current value — drives aria-pressed styling
}

/** One sidebar setting: a registry SettingSpec joined with the selected block. */
interface SettingRow {
  key: string; // blockId:index — settings re-key when the selection moves
  id: string; // the block the control writes
  label: string; // accessible name (rendered as aria-label)
  mode: "field" | "transform" | "setting"; // which editor primitive the control calls
  field: string; // field name ("" unless field-bound)
  setting: string; // island setting name ("" unless island-bound)
  options: SettingOptionRow[]; // choice kinds ([] on the rest)
  value: string; // current value driving text/number inputs and the select ("" elsewhere)
  pressed: boolean; // toggle kind: the current boolean
  placeholder: string; // text kind ("" removes the attribute)
  min: number | null; // number kind — null removes the attribute
  max: number | null;
  step: number | null;
  error: string;
  invalid: boolean;
  // Template branch flags — data-p-show switches on booleans, not equality,
  // so the control kind is precomputed here (state stays dumb-template-ready).
  isChoice: boolean;
  isToggle: boolean;
  isSelect: boolean;
  isText: boolean;
  isNumber: boolean;
  isMedia: boolean;
  mediaSrc: string; // media kind: the carried src ("" = empty state)
  mediaAlt: string;
  hasMedia: boolean; // thumbnail + Replace/Remove vs the Add button
  showAdd: boolean; // empty AND uploads available (URL insertion lives in the canvas card)
  addLabel: string; // "Add image" — the empty-state sidebar affordance
  canUpload: boolean; // OPFS + service worker available
  section: string;
  sectionRole: string;
  sectionKey: string;
  sectionExpanded: boolean;
  showSection: boolean;
  help: string;
}

interface BlockItem {
  type: string;
  label: string;
  icon: string; // sprite ref — "" falls back to the letter badge
  letter: string;
}

/** One patterns-tab group row (also the explorer's category list). */
interface PatternGroupRow {
  name: string;
  selected: boolean;
}

/** One pattern the previews render: name keys the card, label captions it. */
interface PatternItem {
  name: string;
  label: string;
}

/** One row of a pattern instance's Content outline (its direct blocks). */
interface PatternContentRow {
  id: string;
  icon: string; // sprite ref — "" falls back to the letter badge
  letter: string;
  label: string;
  anchor: string; // content preview (heading text)
  selected: boolean; // the unit holding the canvas selection/caret
}

/** One outline row: a heading anywhere in the document, level-indented. */
interface OutlineRow {
  id: string;
  level: string; // chip text: H1…H6
  guide: string; // indent-guide width — proportional to the heading level
  text: string;
  empty: boolean; // "(Empty heading)" — italic text
  badLevel: boolean; // skipped a level vs the previous heading — "(Incorrect heading level)" note
  flagged: boolean; // empty ∨ badLevel — the chip goes amber
}

/** One list-view row: the recursive block tree flattened for data-p-for. */
interface TreeRow {
  id: string;
  pad: string; // depth as padding — recursion lives in state, not templates
  icon: string; // sprite ref — "" falls back to the letter badge
  letter: string;
  label: string;
  anchor: string; // content preview (heading text)
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
    blockLetter: "",
    blockDescription: "",
    blockSettings: [] as SettingRow[],
    blockInspectorTab: "settings",
    blockHasStyles: false,
    settingSectionOpen: {} as Record<string, boolean>,
    settingErrors: {} as Record<string, string>,
    styleHasValues: false,
    styleOptionalOpen: false,
    styleOptional: {} as Record<string, boolean>,
    styleSidesLinked: {} as Record<string, boolean>,
    optionalStyleControls: [] as OptionalStyleControl[],
    // Universal STYLE controls (Phase C / E1) — shown per the block's
    // `supports`, disabled when policy isn't `stylable`. Options DERIVE from
    // the site THEME (src/theme.ts) — no hardcoded scales. Values are
    // Tailwind-native token keys ("lg", "red-500", spacing steps "4"). Scales
    // adapt: ordered token scales render as discrete rails, categorical
    // choices render segmented or as a select, and big palettes use a grid.
    styleFontSizeShown: false,
    styleDisabled: false,
    fontSizeOptions: [] as { key: string; label: string; pressed: boolean }[],
    fontSizeIsSelect: false,
    fontSizeValue: "", // select binding; "" = unset
    // Style variations (C6): the "Styles" panel — named class-sets.
    variationOptions: [] as { name: string; label: string; pressed: boolean }[],
    // Color (C2): text/background rows. Swatch key = the stored value
    // (token key, e.g. "red-500"); css = the token's raw value (the fill).
    colorRows: [] as ColorRow[],
    // Dimensions (C3): padding/margin rows over the numeric spacing steps.
    dimensionRows: [] as ScaleRow[],
    dimensionPanelShown: false,
    spacingBoxShown: false,
    boxPaddingShown: false,
    boxMarginShown: false,
    boxPaddingTop: "",
    boxPaddingRight: "",
    boxPaddingBottom: "",
    boxPaddingLeft: "",
    boxMarginTop: "",
    boxMarginRight: "",
    boxMarginBottom: "",
    boxMarginLeft: "",
    boxSpacingOptions: SPACING_STEPS.map((key) => ({ key, label: key })),
    boxActiveKind: "padding",
    boxActiveSide: "Top",
    boxActiveKey: "padding-Top",
    boxActiveLabel: "Padding (all sides)",
    boxActiveValue: "",
    boxActiveRangeIndex: 0,
    boxActiveRangeMax: SPACING_STEPS.length,
    paddingLinkAvailable: false,
    paddingSidesLinked: true,
    paddingSidesLabel: "Separate sides",
    marginLinkAvailable: false,
    marginSidesLinked: true,
    marginSidesLabel: "Separate sides",
    layoutRows: [] as ScaleRow[],
    // Border (C4): width + radius scale rows + a border-color swatch row.
    borderShown: false,
    borderWidthOptions: [] as { key: string; label: string; pressed: boolean }[],
    borderWidthRangeIndex: 0,
    borderWidthRangeMax: 0,
    borderWidthValue: "",
    borderRadiusOptions: [] as { key: string; label: string; pressed: boolean }[],
    borderRadiusIsSelect: false,
    borderRadiusValue: "",
    borderRadiusRangeIndex: 0,
    borderRadiusRangeMax: 0,
    borderStyleOptions: [] as { key: string; label: string; pressed: boolean }[],
    borderColorShown: false,
    borderColorGrid: false,
    borderColorValue: "",
    borderColorSwatches: [] as Swatch[],
    borderColorFamilies: [] as SwatchFamily[],
    // Typography extras (C5): line-height / letter-spacing / decoration / case.
    typographyRows: [] as ScaleRow[],
    // Unresolved utility chips (E4): utility-shaped classes on the selected
    // block whose token the theme lacks — claimed at the panel level; the
    // Define… click jumps to the Design tab prefilled.
    unresolvedChips: [] as { cls: string; suffix: string; ns: string; label: string }[],
    // CSS engine status (E3) + the Design tab (E4).
    engineActive: false,
    engineLabel: "probing…",
    designSections: [] as DesignSection[],
    designSpacing: "",
    designExport: "",
    designImportError: "",
    defineShown: false,
    defineName: "",
    cssImportShown: false, // E5: engine.classesFromCss present
    cssImportResult: "",
    blockIsPattern: false, // pattern instance selected → pattern card + Edit pattern
    blockPattern: "", // its definition name
    blockPatternRoot: "", // the instance root id (inner selections remap here)
    blockPatternContent: [] as PatternContentRow[], // the copy's CONTENT blocks (Content outline)
    // isolation editing modes: the page document parks, the SAME full editor
    // takes the isolated content. "definition" = library edit (Save =
    // versioned publish); "instance" = a placed copy's Edit pattern (Save =
    // apply to that copy only). thoughts/012.
    templateMode: false as false | "definition" | "instance",
    templateLabel: "",
    templateIsInstance: false, // banner copy + save label switch on this
    templateError: "",
    emptyNote: "No block selected.",
    breadcrumb: "Document",
    // list view (left rail, exclusive with the inserter)
    docEpoch: 0, // bumped by onChange — the model's change signal FOR EFFECTS (the model itself is not reactive)
    treeOpen: false,
    treeTab: "list",
    treeRows: [] as TreeRow[],
    // containers (patterns included) are COLLAPSED by default — a row is
    // open only after an explicit toggle or a selection-reveal
    treeExpanded: {} as Record<string, boolean>,
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
    // patterns tab (left rail): group list → flyout preview pane; the
    // explorer dialog is the full-library escalation
    patternQuery: "",
    patternGroup: "", // "" = no group selected (flyout closed unless searching)
    patternGroups: [] as PatternGroupRow[],
    patternFlyoutOpen: false,
    patternFlyoutTitle: "",
    patternItems: [] as PatternItem[],
    patternNoResults: false,
    explorerOpen: false,
    explorerQuery: "",
    explorerGroup: "All",
    explorerGroups: [] as PatternGroupRow[],
    explorerItems: [] as PatternItem[],
    explorerNoResults: false,
  });

  // Wired by setup(); the actions close over them.
  let editor: ReturnType<typeof createEditor>;
  let canvasEl: HTMLElement;
  let wrapEl: HTMLElement;
  let inserterAnchorId: string | null = null;

  const iconOf = (type: string) =>
    iconRef(getBlockType(type)?.icon ?? (type === "raw-html" ? "html" : undefined));
  const letterOf = (type: string) => (type[0] ?? "?").toUpperCase();
  const labelOf = (type: string) =>
    blockTypes().find((b) => b.type === type)?.label ?? (type === "raw-html" ? "HTML" : type);
  // Pattern provenance wins where a block IS a stamped pattern root (#239's
  // settled design: informational label, may go stale after edits — fine).
  const blockLabelOf = (b: Block): string =>
    (b.pattern && getPattern(b.pattern)?.label) || labelOf(b.type);
  const asItem = (b: { type: string; label: string }): BlockItem => ({
    type: b.type,
    label: b.label,
    icon: iconOf(b.type),
    letter: letterOf(b.type),
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

  // The block panel's target is STICKY while the user works in the sidebar:
  // focusing an option input moves the caret out of the canvas (active goes
  // null), but interacting with a block's options must never make those
  // options disappear. The stick releases when the block goes away or focus
  // leaves the sidebar without yielding a real target.
  let inspectedId: string | null = null;
  const panelTarget = () => {
    const live = singleTarget();
    if (live) {
      inspectedId = live;
      return live;
    }
    const focus = document.activeElement;
    // Focus IN TRANSIT (mousedown blurs the carrier before focusin lands on
    // the sidebar button — activeElement is body for a tick): HOLD the stick.
    // Releasing here wiped the panel mid-click, so "Edit pattern" acted on
    // nothing whenever only a caret (not a block selection) sat inside.
    if (!focus || focus === document.body) {
      return inspectedId && editor.getBlock(inspectedId) ? inspectedId : null;
    }
    if (inspectedId && editor.getBlock(inspectedId) && focus.closest("[data-pbe-keep-selection]"))
      return inspectedId;
    inspectedId = null;
    return null;
  };

  const imageValue = (id: string, field: string): PublrEditor.ImageValue => {
    const v = editor.getBlock(id)?.fields[field];
    return typeof v === "object" && v !== null
      ? { src: v.src ?? "", alt: v.alt ?? "", width: v.width ?? "", height: v.height ?? "" }
      : { src: "", alt: "", width: "", height: "" };
  };

  const plainText = (html: FieldValue | undefined): string => {
    const d = document.createElement("div");
    d.innerHTML = typeof html === "string" ? html : "";
    return d.textContent ?? "";
  };

  // List view rows: the recursive block tree FLATTENED into a list — depth
  // becomes padding, collapse prunes the walk. Runs ONLY inside its effect:
  // reading docEpoch there is what subscribes it to model edits, and every
  // run re-collects the treeExpanded[id] deps for the CURRENT blocks — a
  // direct (untracked) call would freeze the dep set at whatever the model
  // looked like last.
  function syncTree() {
    void state.docEpoch;
    const selected = new Set(editor.selection.blocks);
    if (editor.selection.active) selected.add(editor.selection.active);
    const rows: TreeRow[] = [];
    const rowFor = (b: Block, depth: number, hasChildren: boolean, expanded: boolean): TreeRow => ({
      id: b.id,
      pad: `${4 + depth * 20}px`,
      // headings show their level's icon (H2); every
      // pattern instance leads with the ONE shared pattern icon — the
      // definition's icon is inserter metadata, not tree identity
      icon:
        b.type === "heading"
          ? iconRef(`heading-level-${plainText(b.fields.level).replace(/\D/g, "") || "2"}`)
          : b.pattern && getPattern(b.pattern)
            ? iconOf(PATTERN_ROOT_TYPE)
            : iconOf(b.type),
      letter: letterOf(b.type),
      label: blockLabelOf(b),
      anchor: b.type === "heading" ? plainText(b.fields.text).trim() : "",
      hasChildren,
      expanded,
      selected: selected.has(b.id),
    });
    const walk = (blocks: Block[], depth: number) => {
      for (const b of blocks) {
        // PATTERN SELECTION STATE (thoughts/012): in the MAIN editor a
        // pattern subtree reads as its CONTENT — a flat list of content
        // blocks under the root, no layout/invisible rows. The full
        // structure belongs to Edit pattern's isolation editor.
        if (b.pattern && getPattern(b.pattern)) {
          const content = patternContentBlocks(b);
          const expanded = content.length > 0 && !!state.treeExpanded[b.id];
          rows.push(rowFor(b, depth, content.length > 0, expanded));
          if (expanded) for (const c of content) rows.push(rowFor(c, depth + 1, false, false));
          continue;
        }
        const hasChildren = !!b.children && b.children.length > 0;
        const expanded = hasChildren && !!state.treeExpanded[b.id];
        rows.push(rowFor(b, depth, hasChildren, expanded));
        if (expanded) walk(b.children!, depth + 1);
      }
    };
    walk(editor.getModel().blocks, 0);
    state.treeRows = rows;
  }

  // Outline: document stats + the heading outline (level chips, indent
  // guides, empty-heading warnings — a document overview). Same
  // docEpoch discipline as syncTree: runs only inside its effect.
  function syncOutline() {
    void state.docEpoch;
    const AVERAGE_WPM = 189; // a common reading-speed constant
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
        if (spec.type === "text") count(plainText(b.fields[spec.name]));
        else if (spec.type === "rich") count(plainText(b.fields[spec.name]));
      }
      if (b.type === "heading") {
        const level = Number(plainText(b.fields.level).replace(/\D/g, "")) || 2;
        const text = plainText(b.fields.text).trim();
        // The conventional structure check: a heading may go any number of levels
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

  // --- CSS engine + theme editing (E3/E4) -----------------------------------

  // The class universe the engine compiles: the canvas PLUS every registered
  // pattern's classes, so the inserter's pattern PREVIEWS render even when
  // their classes aren't on the canvas yet (a pattern is styled before it's
  // inserted). Pattern set is static per session — collected once.
  let patternClasses: string[] | null = null;
  function allClasses(): string[] {
    if (!patternClasses) {
      const set = new Set<string>();
      for (const pattern of patternTypes())
        for (const c of collectClasses(pattern.content)) set.add(c);
      patternClasses = [...set];
    }
    return [...new Set([...collectClasses(editor.serialize()), ...patternClasses])];
  }

  let engineTimer: number | undefined;
  function refreshEngineCss(): void {
    if (!cssEngine) return;
    window.clearTimeout(engineTimer);
    engineTimer = window.setTimeout(() => {
      void cssEngine!
        .compile(allClasses())
        .then((r) => {
          engineTag.textContent = r.css;
        })
        .catch((e: unknown) => console.warn("[pbe] engine compile failed:", e));
    }, 150);
  }

  function syncDesignPanel(): void {
    const theme = activeTheme();
    const row = (name: string, key: string, value: string, isColor = false): DesignRow => ({
      name,
      key,
      value,
      isColor,
    });
    state.designSections = [
      {
        ns: "text",
        label: "Font sizes",
        rows: fontSizes(theme).map((o) => row(`text-${o.key}`, o.key, o.value)),
      },
      {
        ns: "color",
        label: "Colors",
        rows: colors(theme).map((o) => row(`color-${o.key}`, o.key, o.value, true)),
      },
      {
        ns: "radius",
        label: "Radii",
        rows: radii(theme).map((o) => row(`radius-${o.key}`, o.key, o.value)),
      },
      {
        ns: "leading",
        label: "Line heights",
        rows: leadings(theme).map((o) => row(`leading-${o.key}`, o.key, o.value)),
      },
      {
        ns: "tracking",
        label: "Letter spacings",
        rows: trackings(theme).map((o) => row(`tracking-${o.key}`, o.key, o.value)),
      },
    ];
    state.designSpacing = spacingBase(theme) ?? "";
    state.designExport = themeToCssText(theme);
    state.cssImportShown = !!cssEngine?.classesFromCss;
  }

  // The one theme-mutation choke point: install, re-render, refresh every
  // consumer (canvas CSS, controls, design tab, inline :root).
  function applyTheme(tokens: { name: string; value: string }[]): void {
    editor.setTheme({ tokens });
    refreshInlineThemeCss();
    refreshEngineCss();
    syncDesignPanel();
    syncBlockPanel();
  }

  function syncBlockPanel() {
    const n = editor.selection.blocks.length;
    const id = panelTarget();
    let block = id ? editor.getBlock(id) : null;
    let selectedPathIds = new Set<string>();
    if (block && id) {
      const path = pathToBlock(editor.getModel().blocks, id);
      const patternRoot = path?.find(
        (candidate) => candidate.pattern && getPattern(candidate.pattern),
      );
      if (patternRoot && patternRoot.id !== id) {
        block = patternRoot;
        selectedPathIds = new Set(path!.map((candidate) => candidate.id));
      }
    }
    state.blockSelected = !!block;
    if (block) {
      const def = getBlockType(block.type);
      // A pattern instance presents its OWN identity, not its root
      // container's — the pattern card + Edit original/Reset replace the
      // block card and its settings (thoughts/011: the door for future
      // template-only options).
      const patternDef = block.pattern ? getPattern(block.pattern) : undefined;
      const editingMode = editor.editingMode(block.id);
      state.blockIsPattern = !!patternDef;
      state.blockPattern = patternDef ? block.pattern! : "";
      state.blockPatternRoot = patternDef ? block.id : "";
      // The Content outline: the copy's CONTENT blocks, recursively —
      // layout and invisible blocks never appear; rows focus on click while
      // the panel stays right here.
      state.blockPatternContent = patternDef
        ? patternContentBlocks(block).map((c) => ({
            id: c.id,
            icon:
              c.type === "heading"
                ? iconRef(`heading-level-${plainText(c.fields.level).replace(/\D/g, "") || "2"}`)
                : iconOf(c.type),
            letter: letterOf(c.type),
            label: labelOf(c.type),
            anchor:
              c.type === "heading"
                ? plainText(c.fields.text).trim()
                : plainText(c.fields.body ?? c.fields.label ?? "")
                    .trim()
                    .slice(0, 40),
            selected: selectedPathIds.has(c.id),
          }))
        : [];
      state.blockLabel = blockLabelOf(block);
      // pattern instances all share the pattern-root icon (tree/toolbar/card agree)
      state.blockIcon = patternDef ? iconOf(PATTERN_ROOT_TYPE) : iconOf(block.type);
      state.blockLetter = patternDef
        ? (patternDef.label[0] ?? "?").toUpperCase()
        : letterOf(block.type);
      state.blockDescription = patternDef
        ? (patternDef.description ??
          "A pattern instance. Edits here never change the original design.")
        : (def?.description ?? "");
      // Registry SettingSpecs joined with THIS block: pressed/value = its
      // current field value (its type for transform settings, the EFFECTIVE
      // island value — sparse model over declared default — for island
      // settings). Re-derived on every selection move and committed edit — a
      // transform lands here with the same id but a fresh type, and the
      // control re-presses.
      const roleRank = { content: 0, structure: 1, design: 2, advanced: 3 } as const;
      const roleLabel = {
        content: "Content",
        structure: "Layout",
        design: "Appearance",
        advanced: "Advanced",
      } as const;
      const settingSpecs = (patternDef ? [] : (def?.settings ?? []))
        .map((s, index) => {
          const field = s.field
            ? def?.fields.find((candidate) => candidate.name === s.field)
            : null;
          const role =
            s.role ??
            (s.transform || field?.type === "tag" ? "structure" : s.field ? "content" : "advanced");
          return { s, index, role };
        })
        .filter(({ role }) => editingMode === "default" || role === "content")
        .filter(({ s }) => {
          if (!s.when) return true;
          const dependency = s.when.field
            ? block.fields[s.when.field]
            : block.settings && s.when.setting! in block.settings
              ? block.settings[s.when.setting!]
              : def?.settings?.find((candidate) => candidate.setting === s.when!.setting)?.default;
          return "equals" in s.when
            ? JSON.stringify(dependency) === JSON.stringify(s.when.equals)
            : JSON.stringify(dependency) !== JSON.stringify(s.when.notEquals);
        })
        .sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.index - b.index);
      state.blockSettings = settingSpecs.map(({ s, index, role }, rowIndex) => {
        const mode = s.transform
          ? ("transform" as const)
          : s.field
            ? ("field" as const)
            : ("setting" as const);
        const effective =
          mode === "setting" && block.settings && s.setting! in block.settings
            ? block.settings[s.setting!]
            : s.default;
        const picked = (v: string) =>
          mode === "transform"
            ? block.type === v
            : mode === "field"
              ? block.fields[s.field!] === v
              : effective === v;
        // media rows edit the image-carrier object through its parts
        const media =
          s.control === "media" && s.field
            ? ((block.fields[s.field] ?? {}) as Partial<PublrEditor.ImageValue>)
            : null;
        // island values are JSON primitives per the control-kind contract;
        // anything else renders as "" rather than "[object Object]"
        const display =
          typeof effective === "string" ||
          typeof effective === "number" ||
          typeof effective === "boolean"
            ? String(effective)
            : "";
        return {
          key: `${block.id}:${index}`,
          id: block.id,
          label: s.label,
          mode,
          field: s.field ?? "",
          setting: s.setting ?? "",
          options: (s.options ?? []).map((o) => ({
            value: o.value,
            label: o.label,
            icon: iconRef(o.icon),
            pressed: picked(o.value),
          })),
          value:
            mode === "setting"
              ? display
              : mode === "field" && s.control === "text"
                ? plainText(block.fields[s.field!])
                : "",
          pressed: effective === true,
          placeholder: s.placeholder ?? "",
          min: s.min ?? null,
          max: s.max ?? null,
          step: s.step ?? null,
          error: state.settingErrors[`${block.id}:${index}`] ?? "",
          invalid: !!state.settingErrors[`${block.id}:${index}`],
          isChoice: s.control === "toggle-group",
          isToggle: s.control === "toggle",
          isSelect: s.control === "select",
          isText: s.control === "text",
          isNumber: s.control === "number",
          isMedia: s.control === "media",
          mediaSrc: media?.src ?? "",
          mediaAlt: media?.alt ?? "",
          hasMedia: !!media?.src,
          showAdd: !media?.src && mediaUploadsAvailable,
          addLabel: `Add ${s.label.toLowerCase()}`,
          canUpload: mediaUploadsAvailable,
          section: roleLabel[role],
          sectionRole: role,
          sectionKey: `${block.id}:${role}`,
          sectionExpanded: state.settingSectionOpen[`${block.id}:${role}`] !== false,
          showSection: rowIndex === 0 || settingSpecs[rowIndex - 1].role !== role,
          help: s.help ?? "",
        };
      });
      // Universal STYLE controls (Phase C): shown per the block's `supports`,
      // disabled when policy locks style (content-only). Value from editor.getStyle.
      const supports =
        patternDef || editingMode !== "default" ? undefined : editor.styleSupports(id!);
      const variations =
        patternDef || editingMode !== "default" ? undefined : editor.blockVariations(id!);
      state.blockHasStyles = !!supports || !!variations?.length;
      state.styleHasValues =
        Object.keys(PublrEditor.STYLE_PROPS).some((prop) => !!editor.getStyle(id!, prop)) ||
        !!editor.getStyle(id!, "variation");
      if (!state.blockHasStyles && state.blockInspectorTab === "styles")
        state.blockInspectorTab = "settings";
      const curVariation = editor.getStyle(id!, "variation");
      // "default" leads the grid — pressed when no variation
      // is set; picking it clears. The name is reserved by the chrome.
      state.variationOptions = variations?.length
        ? [
            { name: "default", label: "Default", pressed: !curVariation },
            ...variations.map((v) => ({
              name: v.name,
              label: v.label,
              pressed: v.name === curVariation,
            })),
          ]
        : [];
      // Everything below derives from the SITE THEME (E1) — token scales in,
      // control options out. A control renders segmented up to SEG_MAX
      // options, a <select> above (the Tailwind default: 13 font sizes); a
      // palette renders a flat swatch row up to GRID_MIN, a family grid above.
      const theme = activeTheme();
      const SEG_MAX = 8;
      const GRID_MIN = 12;
      const scaleRow = (
        prop: string,
        label: string,
        opts: { key: string; label: string }[],
        none?: boolean,
        allowCustom = true,
      ): ScaleRow => {
        const cur = editor.getStyle(id!, prop);
        const options = opts.map((o) => ({ ...o, pressed: o.key === cur }));
        const rangeProps = new Set([
          "padding",
          "paddingTop",
          "paddingRight",
          "paddingBottom",
          "paddingLeft",
          "margin",
          "marginTop",
          "marginRight",
          "marginBottom",
          "marginLeft",
          "width",
          "height",
          "minHeight",
          "minWidth",
          "flexBasis",
          "gap",
          "rowGap",
          "columnGap",
          "gridColumns",
          "lineHeight",
          "letterSpacing",
        ]);
        const isRange = rangeProps.has(prop) && options.length > 1;
        // The keyword groups get a leading "none" segment (a "−" entry): an
        // explicit clear beats the hidden re-click-to-clear affordance.
        if (none && !isRange) options.unshift({ key: "none", label: "−", pressed: !cur });
        const rangeIndex = options.findIndex((option) => option.key === cur) + 1;
        return {
          prop,
          label,
          options,
          isSelect: !isRange && options.length > SEG_MAX,
          isRange,
          isSegmented: !isRange && options.length <= SEG_MAX,
          rangeIndex,
          rangeMax: options.length,
          value: cur ?? "",
          allowCustom,
          showCustomDisclosure: allowCustom && !isRange,
        };
      };
      const colorRow = (prop: string, label: string): ColorRow => {
        const value = editor.getStyle(id!, prop) ?? "";
        const all = colors(theme);
        const swatches = all.map((c: ColorOption) => ({
          key: c.key,
          css: c.value,
          label: c.key,
          pressed: c.key === value,
        }));
        const grid = swatches.length > GRID_MIN;
        const families: SwatchFamily[] = [];
        if (grid) {
          all.forEach((c, i) => {
            const row = families.find((f) => f.family === c.family);
            if (row) row.swatches.push(swatches[i]);
            else families.push({ family: c.family, swatches: [swatches[i]] });
          });
        }
        return { prop, label, value, grid, swatches: grid ? [] : swatches, families };
      };
      const capabilities = [
        ["fontSize", "Font size", supports?.typography?.fontSize],
        ["lineHeight", "Line height", supports?.typography?.lineHeight],
        ["letterSpacing", "Letter spacing", supports?.typography?.letterSpacing],
        ["decoration", "Decoration", supports?.typography?.decoration],
        ["letterCase", "Letter case", supports?.typography?.letterCase],
        ["textAlign", "Text alignment", supports?.typography?.textAlign],
        ["fontWeight", "Font weight", supports?.typography?.fontWeight],
        ["fontStyle", "Font style", supports?.typography?.fontStyle],
        ["textColor", "Text color", supports?.color?.text],
        ["backgroundColor", "Background color", supports?.color?.background],
        ["padding", "Padding", supports?.spacing?.padding],
        ["paddingTop", "Padding top", supports?.spacing?.paddingTop],
        ["paddingRight", "Padding right", supports?.spacing?.paddingRight],
        ["paddingBottom", "Padding bottom", supports?.spacing?.paddingBottom],
        ["paddingLeft", "Padding left", supports?.spacing?.paddingLeft],
        ["margin", "Margin", supports?.spacing?.margin],
        ["marginTop", "Margin top", supports?.spacing?.marginTop],
        ["marginRight", "Margin right", supports?.spacing?.marginRight],
        ["marginBottom", "Margin bottom", supports?.spacing?.marginBottom],
        ["marginLeft", "Margin left", supports?.spacing?.marginLeft],
        ["width", "Width", supports?.dimensions?.width],
        ["height", "Height", supports?.dimensions?.height],
        ["minHeight", "Minimum height", supports?.dimensions?.minHeight],
        ["minWidth", "Minimum width", supports?.dimensions?.minWidth],
        ["flexBasis", "Flex basis", supports?.dimensions?.flexBasis],
        ["aspectRatio", "Aspect ratio", supports?.dimensions?.aspectRatio],
        ["gap", "Gap", supports?.layout?.gap],
        ["rowGap", "Row gap", supports?.layout?.rowGap],
        ["columnGap", "Column gap", supports?.layout?.columnGap],
        ["justifyContent", "Justification", supports?.layout?.justifyContent],
        ["alignItems", "Items alignment", supports?.layout?.alignItems],
        ["flexWrap", "Wrapping", supports?.layout?.flexWrap],
        ["gridColumns", "Grid columns", supports?.layout?.gridColumns],
        ["borderWidth", "Border width", supports?.border?.width],
        ["borderColor", "Border color", supports?.border?.color],
        ["borderRadius", "Border radius", supports?.border?.radius],
        ["borderStyle", "Border style", supports?.border?.style],
      ] as const;
      const paddingSides = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
      const marginSides = ["marginTop", "marginRight", "marginBottom", "marginLeft"];
      state.paddingLinkAvailable =
        blockSupportsStyle(supports, "padding") &&
        paddingSides.every((prop) => blockSupportsStyle(supports, prop));
      state.marginLinkAvailable =
        blockSupportsStyle(supports, "margin") &&
        marginSides.every((prop) => blockSupportsStyle(supports, prop));
      const linked = (kind: "padding" | "margin", sides: string[], available: boolean) => {
        if (!available) return true;
        const key = `${id}:${kind}`;
        if (!(key in state.styleSidesLinked))
          state.styleSidesLinked[key] = !sides.some((prop) => !!editor.getStyle(id!, prop));
        return state.styleSidesLinked[key];
      };
      state.paddingSidesLinked = linked("padding", paddingSides, state.paddingLinkAvailable);
      state.marginSidesLinked = linked("margin", marginSides, state.marginLinkAvailable);
      state.paddingSidesLabel = state.paddingSidesLinked ? "Separate sides" : "Link sides";
      state.marginSidesLabel = state.marginSidesLinked ? "Separate sides" : "Link sides";
      state.boxPaddingShown = state.paddingLinkAvailable;
      state.boxMarginShown = state.marginLinkAvailable;
      state.spacingBoxShown = state.boxPaddingShown || state.boxMarginShown;
      type BoxValueKey =
        | "boxPaddingTop"
        | "boxPaddingRight"
        | "boxPaddingBottom"
        | "boxPaddingLeft"
        | "boxMarginTop"
        | "boxMarginRight"
        | "boxMarginBottom"
        | "boxMarginLeft";
      const syncBoxValues = (kind: "padding" | "margin", isLinked: boolean) => {
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          const value = editor.getStyle(id!, isLinked ? kind : `${kind}${side}`) ?? "";
          const stateKey = `box${kind === "padding" ? "Padding" : "Margin"}${side}` as BoxValueKey;
          state[stateKey] = value;
        }
      };
      syncBoxValues("padding", state.paddingSidesLinked);
      syncBoxValues("margin", state.marginSidesLinked);
      const activeKind = state.boxActiveKind === "margin" ? "margin" : "padding";
      const activeSide = ["Top", "Right", "Bottom", "Left"].includes(state.boxActiveSide)
        ? state.boxActiveSide
        : "Top";
      const activeLinked =
        activeKind === "padding" ? state.paddingSidesLinked : state.marginSidesLinked;
      state.boxActiveKey = `${activeKind}-${activeSide}`;
      state.boxActiveLabel = `${activeKind === "padding" ? "Padding" : "Margin"} (${activeLinked ? "all sides" : activeSide.toLowerCase()})`;
      state.boxActiveValue =
        editor.getStyle(id!, activeLinked ? activeKind : `${activeKind}${activeSide}`) ?? "";
      state.boxActiveRangeIndex =
        SPACING_STEPS.findIndex((step) => step === state.boxActiveValue) + 1;
      state.optionalStyleControls = capabilities
        .filter(
          ([prop, , support]) =>
            support &&
            typeof support === "object" &&
            support.default === false &&
            !(state.paddingLinkAvailable && paddingSides.includes(prop)) &&
            !(state.marginLinkAvailable && marginSides.includes(prop)),
        )
        .map(([prop, label]) => ({
          prop,
          label,
          enabled: !!state.styleOptional[prop] || !!editor.getStyle(id!, prop),
        }));
      const shown = (prop: string): boolean => {
        const support = capabilities.find(([candidate]) => candidate === prop)?.[2];
        if (!support || !blockSupportsStyle(supports, prop)) return false;
        return (
          typeof support === "boolean" ||
          support.default !== false ||
          !!state.styleOptional[prop] ||
          !!editor.getStyle(id!, prop)
        );
      };
      const supportsFontSize = shown("fontSize");
      state.styleDisabled = !editor.canStyle(id!);
      const fsRow = supportsFontSize
        ? scaleRow(
            "fontSize",
            "Font size",
            fontSizes(theme).map((o) => ({ key: o.key, label: o.key })),
          )
        : null;
      state.fontSizeOptions = fsRow?.options ?? [];
      state.fontSizeIsSelect = fsRow?.isSelect ?? false;
      state.fontSizeValue = fsRow?.value ?? "";
      state.colorRows = [
        { prop: "textColor", label: "Text", shown: shown("textColor") },
        { prop: "backgroundColor", label: "Background", shown: shown("backgroundColor") },
      ]
        .filter((r) => r.shown)
        .map((r) => colorRow(r.prop, r.label));
      state.dimensionRows = [
        {
          prop: "padding",
          label: "Padding",
          shown: !state.paddingLinkAvailable && shown("padding"),
        },
        ...paddingSides.map((prop) => ({
          prop,
          label: prop
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .replace(/^./, (c) => c.toUpperCase()),
          shown: !state.paddingLinkAvailable && shown(prop),
        })),
        {
          prop: "margin",
          label: "Margin",
          shown: !state.marginLinkAvailable && shown("margin"),
        },
        ...marginSides.map((prop) => ({
          prop,
          label: prop
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .replace(/^./, (c) => c.toUpperCase()),
          shown: !state.marginLinkAvailable && shown(prop),
        })),
        { prop: "width", label: "Width", shown: shown("width") },
        { prop: "height", label: "Height", shown: shown("height") },
        { prop: "minHeight", label: "Minimum height", shown: shown("minHeight") },
        { prop: "minWidth", label: "Minimum width", shown: shown("minWidth") },
        { prop: "flexBasis", label: "Flex basis", shown: shown("flexBasis") },
      ]
        .filter((r) => r.shown)
        .map((r) =>
          scaleRow(
            r.prop,
            r.label,
            SPACING_STEPS.map((s) => ({ key: s, label: s })),
          ),
        );
      const aspectValues =
        typeof supports?.dimensions?.aspectRatio === "object" &&
        supports.dimensions.aspectRatio.values
          ? supports.dimensions.aspectRatio.values
          : ["auto", "square", "video"];
      if (shown("aspectRatio"))
        state.dimensionRows.push(
          scaleRow(
            "aspectRatio",
            "Aspect ratio",
            aspectValues.map((key) => ({ key, label: key })),
          ),
        );
      state.dimensionPanelShown = state.spacingBoxShown || !!state.dimensionRows.length;
      state.layoutRows = [
        shown("gap")
          ? scaleRow(
              "gap",
              "Gap",
              SPACING_STEPS.map((key) => ({ key, label: key })),
            )
          : null,
        shown("rowGap")
          ? scaleRow(
              "rowGap",
              "Row gap",
              SPACING_STEPS.map((key) => ({ key, label: key })),
            )
          : null,
        shown("columnGap")
          ? scaleRow(
              "columnGap",
              "Column gap",
              SPACING_STEPS.map((key) => ({ key, label: key })),
            )
          : null,
        shown("justifyContent")
          ? scaleRow(
              "justifyContent",
              "Justification",
              JUSTIFY_CONTENT.map(({ key, label }) => ({ key, label })),
              true,
              false,
            )
          : null,
        shown("alignItems")
          ? scaleRow(
              "alignItems",
              "Items alignment",
              ALIGN_ITEMS.map(({ key, label }) => ({ key, label })),
              true,
              false,
            )
          : null,
        shown("flexWrap")
          ? scaleRow(
              "flexWrap",
              "Wrapping",
              FLEX_WRAPS.map(({ key, label }) => ({ key, label })),
              true,
              false,
            )
          : null,
        shown("gridColumns")
          ? scaleRow(
              "gridColumns",
              "Grid columns",
              (typeof supports?.layout?.gridColumns === "object" &&
              supports.layout.gridColumns.values
                ? supports.layout.gridColumns.values
                : ["1", "2", "3", "4", "5", "6"]
              ).map((key) => ({ key, label: key })),
            )
          : null,
      ].filter((row): row is ScaleRow => !!row);
      // Border (C4)
      const bw = editor.getStyle(id!, "borderWidth");
      state.borderWidthOptions = shown("borderWidth")
        ? BORDER_WIDTH_STEPS.map((s) => ({ key: s, label: s, pressed: s === bw }))
        : [];
      state.borderWidthRangeIndex = state.borderWidthOptions.findIndex((o) => o.key === bw) + 1;
      state.borderWidthRangeMax = state.borderWidthOptions.length;
      state.borderWidthValue = bw ?? "";
      const radiusRow = shown("borderRadius")
        ? scaleRow(
            "borderRadius",
            "Radius",
            radii(theme).map((o) => ({ key: o.key, label: o.key })),
          )
        : null;
      state.borderRadiusOptions = radiusRow?.options ?? [];
      state.borderRadiusIsSelect = radiusRow?.isSelect ?? false;
      state.borderRadiusValue = radiusRow?.value ?? "";
      state.borderRadiusRangeIndex = radiusRow?.rangeIndex ?? 0;
      state.borderRadiusRangeMax = radiusRow?.rangeMax ?? 0;
      const bcRow = shown("borderColor") ? colorRow("borderColor", "Color") : null;
      state.borderColorShown = !!bcRow;
      state.borderColorGrid = bcRow?.grid ?? false;
      state.borderColorValue = bcRow?.value ?? "";
      state.borderColorSwatches = bcRow?.swatches ?? [];
      state.borderColorFamilies = bcRow?.families ?? [];
      const borderStyle = editor.getStyle(id!, "borderStyle");
      state.borderStyleOptions = shown("borderStyle")
        ? BORDER_STYLES.map(({ key, label }) => ({ key, label, pressed: key === borderStyle }))
        : [];
      state.borderShown =
        !!state.borderWidthOptions.length ||
        !!state.borderRadiusOptions.length ||
        state.borderColorShown ||
        !!state.borderStyleOptions.length;
      // Typography extras (C5): line-height + letter-spacing scales come from
      // the theme; decoration + case are keyword utilities (the spec, not the
      // theme) and keep their static vocabulary.
      state.typographyRows = (
        [
          [
            "lineHeight",
            "Line height",
            leadings(theme).map((o) => ({ key: o.key, label: o.key })),
            shown("lineHeight"),
            false,
          ],
          [
            "textAlign",
            "Text alignment",
            TEXT_ALIGNMENTS.map(({ key, label }) => ({ key, label })),
            shown("textAlign"),
            true,
          ],
          [
            "fontWeight",
            "Font weight",
            FONT_WEIGHTS.map(({ key, label }) => ({ key, label })),
            shown("fontWeight"),
            true,
          ],
          [
            "fontStyle",
            "Font style",
            FONT_STYLES.map(({ key, label }) => ({ key, label })),
            shown("fontStyle"),
            true,
          ],
          [
            "letterSpacing",
            "Letter spacing",
            trackings(theme).map((o) => ({ key: o.key, label: o.key })),
            shown("letterSpacing"),
            false,
          ],
          [
            "decoration",
            "Decoration",
            DECORATIONS.map((k) => ({ key: k.key, label: k.label })),
            shown("decoration"),
            true,
          ],
          [
            "letterCase",
            "Letter case",
            LETTER_CASES.map((k) => ({ key: k.key, label: k.label })),
            shown("letterCase"),
            true,
          ],
        ] as [string, string, { key: string; label: string }[], boolean, boolean][]
      )
        .filter(([, , , shown]) => shown)
        .map(([prop, label, opts, , none]) => scaleRow(prop, label, opts, none));
      state.styleFontSizeShown = supportsFontSize || !!state.typographyRows.length;
      // Unresolved utility chips (E4): utility-shaped classes with no token.
      const ownClasses = (editor.getBlock(id!)?.classes ?? "").split(/\s+/).filter(Boolean);
      state.unresolvedChips = unresolvedUtilities(ownClasses).map((u) => ({
        cls: u.cls,
        suffix: u.suffix,
        ns: u.namespaces[0],
        label: u.namespaces.map((n) => `--${n}-${u.suffix}`).join("  or  "),
      }));
    } else {
      state.blockDescription = "";
      state.blockSettings = [];
      state.blockHasStyles = false;
      state.styleHasValues = false;
      state.blockInspectorTab = "settings";
      state.styleFontSizeShown = false;
      state.fontSizeOptions = [];
      state.fontSizeIsSelect = false;
      state.fontSizeValue = "";
      state.variationOptions = [];
      state.colorRows = [];
      state.dimensionRows = [];
      state.dimensionPanelShown = false;
      state.spacingBoxShown = false;
      state.boxPaddingShown = false;
      state.boxMarginShown = false;
      state.paddingLinkAvailable = false;
      state.paddingSidesLinked = true;
      state.paddingSidesLabel = "Separate sides";
      state.marginLinkAvailable = false;
      state.marginSidesLinked = true;
      state.marginSidesLabel = "Separate sides";
      state.layoutRows = [];
      state.borderShown = false;
      state.borderWidthOptions = [];
      state.borderWidthValue = "";
      state.borderRadiusOptions = [];
      state.borderRadiusIsSelect = false;
      state.borderRadiusValue = "";
      state.borderStyleOptions = [];
      state.borderColorShown = false;
      state.borderColorGrid = false;
      state.borderColorValue = "";
      state.borderColorSwatches = [];
      state.borderColorFamilies = [];
      state.typographyRows = [];
      state.optionalStyleControls = [];
      state.styleOptionalOpen = false;
      state.unresolvedChips = [];
      state.blockIsPattern = false;
      state.blockPattern = "";
      state.blockPatternRoot = "";
      state.blockPatternContent = [];
    }
    state.emptyNote = n > 1 ? `${n} blocks selected.` : "No block selected.";
  }

  function syncBreadcrumb() {
    const n = editor.selection.blocks.length;
    const id = panelTarget();
    // full ancestor path breadcrumb: Document › Group › Heading
    const path = id ? pathToBlock(editor.getModel().blocks, id) : null;
    state.breadcrumb =
      n > 1
        ? `Document › ${n} blocks selected`
        : path
          ? ["Document", ...path.map((b) => blockLabelOf(b))].join(" › ")
          : "Document";
  }

  // Familiar block-editor semantics: picking REPLACES an empty default block; otherwise a
  // top-level anchor inserts right after it; anything else appends at the end.
  // A "pattern:<name>" pick stamps the pattern through the same anchor rules.
  function insertFromLibrary(type: string) {
    const pattern = type.startsWith("pattern:") ? type.slice("pattern:".length) : null;
    const anchorId = singleTarget() ?? inserterAnchorId;
    const anchor = anchorId ? editor.getBlock(anchorId) : null;
    if (anchorId && anchor?.type === "paragraph" && !plainText(anchor.fields.body).trim()) {
      if (pattern) editor.replaceWithPattern(anchorId, pattern);
      else editor.replaceBlock(anchorId, type);
    } else if (anchorId && anchor) {
      const model = editor.getModel();
      const at = locateBlock(model.blocks, anchorId);
      // insert is a top-level primitive — a nested anchor appends at the end
      const index = at && at.list === model.blocks ? at.index + 1 : undefined;
      if (pattern) editor.insertPattern(pattern, index);
      else editor.insertBlock(type, index);
    } else if (pattern) {
      editor.insertPattern(pattern);
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

  // The explorer dialog's OPEN path — shared by the rail's "Explore all
  // patterns" button and the in-canvas pickers' "Pattern" entry (which
  // passes the block the picker targeted as the insertion anchor).
  function openExplorer(anchorId?: string | null) {
    if (anchorId) inserterAnchorId = anchorId;
    state.explorerQuery = "";
    state.explorerGroup = state.patternGroup || "All";
    state.explorerOpen = true;
    // Escape must close the dialog wherever focus sits (the search focus
    // below lands a frame later — a modal can't depend on it): document
    // scope, capture phase, detached again on close.
    document.addEventListener("keydown", explorerEscape, true);
    requestAnimationFrame(() => document.getElementById("explorer-search")?.focus());
  }

  // The explorer dialog's close path — shared by the ✕ button, the backdrop
  // click, and the document-level Escape (attached while open).
  function closeExplorer() {
    document.removeEventListener("keydown", explorerEscape, true);
    if (!state.explorerOpen) return;
    state.explorerOpen = false;
    document.getElementById("pattern-explore")?.focus();
  }
  function explorerEscape(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    e.stopPropagation(); // the dialog swallows its own dismissal — nothing else reacts
    closeExplorer();
  }

  // --- isolation editing modes ---------------------------------------------------
  //
  // Not a sub-editor: THE editor enters an isolation mode — the page document
  // is parked, the isolated content loads into the same canvas, and every
  // piece of chrome (rail inserter, sidebar, list view, toolbar) just keeps
  // working because nothing else changed. A banner under the top bar carries
  // the mode: label, error, Cancel, Save. History is isolated for free —
  // loadHtml resets it on the way in AND out.
  //
  // TWO modes over the same machinery (thoughts/012):
  // - "definition": editing a pattern in the LIBRARY. Save = publish —
  //   versioned via publishPattern, previews refresh, placed copies never
  //   move. Entered from the flyout/explorer cards' Edit affordance.
  // - "instance": a placed copy's "Edit pattern". Save applies the edited
  //   blocks back to THAT COPY only (editor.setBlockChildren) — there is no
  //   "source" from the instance's point of view.

  let templateName: string | null = null; // definition mode: the pattern name
  let instanceId: string | null = null; // instance mode: the copy's block id
  let parkedDoc: string | null = null; // the page document while a mode is on

  // Classes lent to the canvas as a BACKDROP during instance isolation (see
  // enterIsolation) — the instance editor isolates the copy's CHILDREN, so the
  // root's own classes (bg, relative/isolate for absolute decorations) aren't
  // in the content; borrowing them onto the canvas renders the children in the
  // same visual context they have on the page. Definition mode passes none —
  // its content includes the root.
  let backdropClasses: string[] = [];
  function enterIsolation(label: string, content: string, backdrop = "") {
    parkedDoc = editor.serialize(); // full editor-pipeline wire — everything survives
    state.templateLabel = label;
    state.templateError = "";
    setTreeOpen(false); // panels re-open fine in-mode; start on the content
    setInserterOpen(false);
    backdropClasses = backdrop.split(/\s+/).filter(Boolean);
    if (backdropClasses.length) canvasEl.classList.add(...backdropClasses);
    // Isolation edits the full structure — every block is selectable, even
    // when the isolated fragment itself carries pattern provenance.
    editor.setPatternsOpaque(false);
    editor.loadHtml(content);
    // land selected on the pattern's root element — the sidebar opens on the
    // whole composition, not on nothing
    const root = editor.getModel().blocks[0];
    if (root) editor.selectBlock(root.id);
  }

  function openTemplateEditor(name: string) {
    const def = getPattern(name);
    if (!def || state.templateMode) return;
    templateName = name;
    state.templateMode = "definition";
    state.templateIsInstance = false;
    enterIsolation(def.label, def.content);
  }

  function openInstanceEditor(id: string) {
    const block = editor.getBlock(id);
    const def = block?.pattern ? getPattern(block.pattern) : undefined;
    if (!block?.children || state.templateMode) return;
    instanceId = id;
    state.templateMode = "instance";
    state.templateIsInstance = true;
    // Borrow the instance root's classes as the canvas backdrop so the
    // children render on the section's own background (the copy's root frame
    // stays in the page — Save writes back via setBlockChildren).
    enterIsolation(def?.label ?? "Pattern", downcast({ blocks: block.children }), block.classes);
  }

  function closeTemplateEditor() {
    if (!state.templateMode) return;
    const restoreId = instanceId; // instance mode: re-select the copy we edited
    state.templateMode = false;
    state.templateError = "";
    templateName = null;
    instanceId = null;
    if (backdropClasses.length) canvasEl.classList.remove(...backdropClasses);
    backdropClasses = [];
    editor.setPatternsOpaque(true); // the page document is back — instances close up
    editor.loadHtml(parkedDoc ?? "");
    parkedDoc = null;
    // ids ride the wire (serialize → loadHtml round-trips them), so the
    // parked document still knows the instance — selection lands back on it
    if (restoreId) editor.selectBlock(restoreId);
  }

  function saveTemplate() {
    if (state.templateMode === "instance") {
      // apply to THIS COPY: restore the page, then write the edited blocks
      // back into the instance — one undo entry on the restored document
      const id = instanceId;
      const content = editor.serialize();
      closeTemplateEditor();
      if (id) editor.setBlockChildren(id, content);
      return;
    }
    if (!templateName || !getPattern(templateName)) return;
    const name = templateName;
    // publishPattern is the whole story: bump from the structural diff
    // (no-op saves keep the version), hard validation with the old
    // definition restored on failure, superseded content archived per
    // version (the future Symbol "Update from Source" base).
    try {
      const { kind } = publishPattern(name, editor.serialize());
      if (kind === "none") {
        closeTemplateEditor();
        return;
      }
    } catch (err) {
      // the mode stays on with the error in the banner
      state.templateError = err instanceof Error ? err.message : String(err);
      return;
    }
    // stale previews: drop the cache entry and refill this pattern's cards
    previewCache.delete(name);
    for (const holder of document.querySelectorAll<HTMLElement>(
      `[data-pattern-preview="${CSS.escape(name)}"]`,
    )) {
      delete holder.dataset.filled;
      holder.textContent = "";
      holder.style.height = "";
    }
    state.libraryEpoch++;
    requestAnimationFrame(fillPatternPreviews);
    closeTemplateEditor();
  }

  return {
    state,
    actions: {
      /** Chrome convention: swallow mousedown so buttons never blur the carrier. */
      swallow() {},

      // --- top bar ---------------------------------------------------------
      // Preview = a SELF-CONTAINED published page: the data-pipeline HTML (the
      // published shape) + all the CSS to render it. That CSS is the engine's
      // compile of the content's own class universe (with preflight prepended,
      // so the standalone page has the same reset production ships) plus the
      // theme :root (so var(--token) references resolve — utilities and the
      // inline backend alike). No engine → the theme :root + inline styles
      // still render the inline backend; the classes backend needs the engine.
      preview() {
        const html = editor.serialize({ pipeline: "data" });
        // Open synchronously (a click-driven window.open survives; an async one
        // is popup-blocked), then stream the compiled doc in.
        const win = window.open("", "_blank");
        void (async () => {
          let css = "";
          try {
            if (cssEngine)
              // The ACTIVE engine (wasm in the browser, or the dev bridge under
              // `vp dev`) — NOT a hardcoded /__jit, which 404s on a static
              // deploy and left the preview unstyled. Preflight is prepended
              // here (the engine emits only utilities + used tokens) so the
              // standalone page ships the same reset production does.
              css = `${preflightCss}\n${(await cssEngine.compile(collectClasses(html))).css}`;
          } catch (e) {
            console.warn("[preview] engine compile failed:", e);
          }
          // The full theme :root — the compile tree-shakes to used tokens, this
          // guarantees every var() (incl. inline-backend declarations) resolves.
          css += `\n${inlineBackend.css?.() ?? ""}`;
          const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview</title><style>${css}</style></head><body>${html}</body></html>`;
          if (win) win.document.write(doc);
          else window.open(URL.createObjectURL(new Blob([doc], { type: "text/html" })), "_blank");
        })();
      },
      toggleOutput: () => (state.outputShown = !state.outputShown),
      copyEditing: () => void navigator.clipboard.writeText(editor.serialize()),
      copyData: () => void navigator.clipboard.writeText(editor.serialize({ pipeline: "data" })),

      // --- sidebar -----------------------------------------------------------
      setSidebarTab(d: Dataset) {
        if (d.tab) state.sidebarTab = d.tab;
        if (d.tab === "design") syncDesignPanel();
      },
      setBlockInspectorTab(d: Dataset) {
        if (d.itab === "settings") state.blockInspectorTab = "settings";
        if (d.itab === "styles" && state.blockHasStyles) state.blockInspectorTab = "styles";
      },
      resetBlockStyles() {
        const id = panelTarget();
        if (id) editor.resetStyles(id);
      },
      toggleStyleOptions() {
        state.styleOptionalOpen = !state.styleOptionalOpen;
      },
      toggleOptionalStyle(d: Dataset) {
        if (!d.prop) return;
        state.styleOptional[d.prop] = !state.styleOptional[d.prop];
        syncBlockPanel();
      },
      resetStylePanel(d: Dataset) {
        const id = panelTarget();
        if (id && d.panel) editor.resetStylePanel(id, d.panel);
      },
      // One action for every option BUTTON (toggle-group); the dataset says
      // which primitive to call. Selection survives because chrome swallows
      // mousedown (the convention above).
      applySetting(d: Dataset) {
        if (!d.id || !d.value) return;
        if (d.mode === "transform") editor.transformBlock(d.id, d.value);
        else if (d.mode === "setting" && d.setting) editor.setSetting(d.id, d.setting, d.value);
        else if (d.field) editor.setField(d.id, d.field, d.value);
      },
      // The boolean flip: the switch's dataset carries the CURRENT value, the
      // click writes its negation.
      toggleSetting(d: Dataset) {
        if (d.id && d.setting) editor.setSetting(d.id, d.setting, d.pressed !== "true");
      },
      resetSettingSection(d: Dataset) {
        if (d.id && d.role) editor.resetSettings(d.id, d.role as PublrEditor.ControlRole);
      },
      toggleSettingSection(d: Dataset) {
        if (!d.section) return;
        state.settingSectionOpen[d.section] = state.settingSectionOpen[d.section] === false;
        syncBlockPanel();
      },
      // Font Size (Phase C style control): re-clicking the active size clears it
      // (familiar block-editor semantics). setStyle enforces supports + policy.
      applyFontSize(d: Dataset) {
        const id = panelTarget();
        if (!id || !d.key) return;
        editor.setStyle(id, "fontSize", editor.getStyle(id, "fontSize") === d.key ? "" : d.key);
      },
      // Style variation (C6): pick a named class-set; "default" (or re-click)
      // clears back to the block's base look.
      applyVariation(d: Dataset) {
        const id = panelTarget();
        if (!id || !d.name) return;
        const cur = editor.getStyle(id, "variation");
        editor.setStyle(id, "variation", d.name === "default" || d.name === cur ? "" : d.name);
      },
      // Color (C2): a swatch sets the TOKEN KEY ("red-500"), re-clicking the
      // active swatch (or Clear, which carries no value) clears it.
      applyColor(d: Dataset) {
        const id = panelTarget();
        if (!id || !d.prop) return;
        const value = d.value && d.value !== editor.getStyle(id, d.prop) ? d.value : "";
        editor.setStyle(id, d.prop, value);
        // A border color is invisible at preflight's 0 width — picking one
        // without a width applies the 1px step.
        if (d.prop === "borderColor" && value && !editor.getStyle(id, "borderWidth"))
          editor.setStyle(id, "borderWidth", "1");
      },
      // Big scales render a <select> — value from the control, "" clears.
      applyStyleSelect(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        if (!id || !d.prop) return;
        editor.setStyle(id, d.prop, (ctx.event.target as HTMLSelectElement).value);
      },

      // --- Design tab (E4): the visual theme editor -------------------------
      // Every edit funnels through applyTheme (install + re-render + refresh).
      designUpdateToken(d: Dataset, ctx: { event: Event }) {
        const value = (ctx.event.target as HTMLInputElement).value.trim();
        if (!d.name || !value) return;
        applyTheme(
          activeTheme().tokens.map((t) => (t.name === d.name ? { name: t.name, value } : t)),
        );
      },
      designRemoveToken(d: Dataset) {
        if (!d.name) return;
        // A token's `--` modifiers (text-lg--line-height) leave with it.
        applyTheme(
          activeTheme().tokens.filter(
            (t) => t.name !== d.name && !t.name.startsWith(`${d.name}--`),
          ),
        );
      },
      designAddToken(d: Dataset, ctx: { event: Event }) {
        const wrap = (ctx.event.target as Element).closest("[data-add]");
        const [keyInput, valueInput] = wrap
          ? [...wrap.querySelectorAll<HTMLInputElement>("input")]
          : [];
        const key = keyInput?.value.trim();
        const value = valueInput?.value.trim();
        if (!d.ns || !key || !value) return;
        const name = `${d.ns}-${key}`;
        applyTheme([...activeTheme().tokens.filter((t) => t.name !== name), { name, value }]);
        if (keyInput) keyInput.value = "";
        if (valueInput) valueInput.value = "";
      },
      designSetSpacing(d: Dataset, ctx: { event: Event }) {
        const value = (ctx.event.target as HTMLInputElement).value.trim();
        if (!value) return;
        const rest = activeTheme().tokens.filter((t) => t.name !== "spacing");
        applyTheme([{ name: "spacing", value }, ...rest]);
      },
      // Import: paste any CSS carrying v4 @theme blocks → becomes the theme.
      designImport(d: Dataset, ctx: { event: Event }) {
        const ta = (ctx.event.target as Element)
          .closest("[data-import]")
          ?.querySelector("textarea");
        const parsed = ta ? themeFromCssText(ta.value) : null;
        if (!parsed) {
          state.designImportError = "No @theme { --token: value; } block found.";
          return;
        }
        state.designImportError = "";
        applyTheme(parsed.tokens);
        if (ta) ta.value = "";
      },
      // The Define… loop: an unresolved chip jumps here with the token name
      // prefilled (ambiguous prefixes: the guess is editable).
      defineFromChip(d: Dataset) {
        if (!d.ns || !d.suffix) return;
        state.defineName = `${d.ns}-${d.suffix}`;
        state.defineShown = true;
        state.sidebarTab = "design";
        syncDesignPanel();
      },
      designDefine(d: Dataset, ctx: { event: Event }) {
        const wrap = (ctx.event.target as Element).closest("[data-define]");
        const [nameInput, valueInput] = wrap
          ? [...wrap.querySelectorAll<HTMLInputElement>("input")]
          : [];
        const name = nameInput?.value.trim().replace(/^--/, "");
        const value = valueInput?.value.trim();
        if (!name || !value) return;
        applyTheme([...activeTheme().tokens.filter((t) => t.name !== name), { name, value }]);
        state.defineShown = false;
        state.defineName = "";
      },
      defineDismiss() {
        state.defineShown = false;
        state.defineName = "";
      },
      // E5 (future capability): engine-translated CSS → classes. Hidden until
      // an engine implements classesFromCss.
      cssToClasses(d: Dataset, ctx: { event: Event }) {
        const ta = (ctx.event.target as Element)
          .closest("[data-css-import]")
          ?.querySelector("textarea");
        if (!cssEngine?.classesFromCss || !ta) return;
        void cssEngine.classesFromCss(ta.value).then((cls) => {
          state.cssImportResult = cls.join(" ");
        });
      },
      // Dimensions (C3): a scale key sets the prop; the "none" segment (and
      // re-clicking the active step) clears it.
      applyDimension(d: Dataset) {
        const id = panelTarget();
        if (!id || !d.prop || !d.key) return;
        const key = d.key === "none" ? "" : d.key;
        editor.setStyle(id, d.prop, key === editor.getStyle(id, d.prop) ? "" : key);
      },
      applyStyleRange(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        if (!id || !d.prop) return;
        const row = [...state.dimensionRows, ...state.layoutRows, ...state.typographyRows].find(
          (candidate) => candidate.prop === d.prop,
        );
        if (!row) return;
        const index = Number((ctx.event.target as HTMLInputElement).value);
        editor.setStyle(id, d.prop, index > 0 ? (row.options[index - 1]?.key ?? "") : "");
      },
      applyBorderRange(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        if (!id || (d.prop !== "borderWidth" && d.prop !== "borderRadius")) return;
        const options =
          d.prop === "borderWidth" ? state.borderWidthOptions : state.borderRadiusOptions;
        const index = Number((ctx.event.target as HTMLInputElement).value);
        editor.setStyle(id, d.prop, index > 0 ? (options[index - 1]?.key ?? "") : "");
      },
      applyBoxSpacing(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        const kind = d.kind === "margin" ? "margin" : d.kind === "padding" ? "padding" : null;
        const side = ["Top", "Right", "Bottom", "Left"].find((value) => value === d.side);
        if (!id || !kind || !side) return;
        const linked = state.styleSidesLinked[`${id}:${kind}`] !== false;
        editor.setStyle(
          id,
          linked ? kind : `${kind}${side}`,
          (ctx.event.target as HTMLInputElement).value.trim(),
        );
      },
      selectBoxSide(d: Dataset) {
        const id = panelTarget();
        const kind = d.kind === "margin" ? "margin" : d.kind === "padding" ? "padding" : null;
        const side = ["Top", "Right", "Bottom", "Left"].find((value) => value === d.side);
        if (!id || !kind || !side) return;
        state.boxActiveKind = kind;
        state.boxActiveSide = side;
        syncBlockPanel();
      },
      applyBoxScale(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        const kind = state.boxActiveKind === "margin" ? "margin" : "padding";
        const side = state.boxActiveSide;
        if (!id) return;
        const index = Number((ctx.event.target as HTMLInputElement).value);
        const value = index > 0 ? (SPACING_STEPS[index - 1] ?? "") : "";
        const linked = state.styleSidesLinked[`${id}:${kind}`] !== false;
        editor.setStyle(id, linked ? kind : `${kind}${side}`, value);
      },
      toggleSpacingSides(d: Dataset) {
        const id = panelTarget();
        const kind = d.kind === "margin" ? "margin" : d.kind === "padding" ? "padding" : null;
        if (!id || !kind) return;
        const sides = ["Top", "Right", "Bottom", "Left"].map((side) => `${kind}${side}`);
        const stateKey = `${id}:${kind}`;
        const isLinked = state.styleSidesLinked[stateKey] !== false;
        const values: Record<string, string> = {};
        if (isLinked) {
          const value = editor.getStyle(id, kind) ?? "";
          values[kind] = "";
          for (const side of sides) values[side] = value;
        } else {
          const value = sides.map((side) => editor.getStyle(id, side) ?? "").find(Boolean) ?? "";
          values[kind] = value;
          for (const side of sides) values[side] = "";
        }
        state.styleSidesLinked[stateKey] = !isLinked;
        editor.setStyles(id, values);
        syncBlockPanel();
      },
      applyStyleInput(d: Dataset, ctx: { event: Event }) {
        const id = panelTarget();
        if (!id || !d.prop) return;
        editor.setStyle(id, d.prop, (ctx.event.target as HTMLInputElement).value.trim());
      },
      // select / text / number commit on change. Numbers are coerced with a
      // NaN guard — an unparsable value never reaches the model; the panel
      // re-sync restores the input from the model instead.
      applyInputSetting(d: Dataset, ctx: { event: Event }) {
        const input = ctx.event.target as HTMLInputElement | HTMLSelectElement;
        if (!d.id || (!d.setting && !d.field)) return;
        if (d.kind === "number" && d.setting) {
          const numberInput = input as HTMLInputElement;
          const n = Number(numberInput.value);
          const min = numberInput.min === "" ? null : Number(numberInput.min);
          const max = numberInput.max === "" ? null : Number(numberInput.max);
          const valid =
            numberInput.value.trim() !== "" &&
            Number.isFinite(n) &&
            (min === null || n >= min) &&
            (max === null || n <= max);
          if (valid) {
            if (d.key) delete state.settingErrors[d.key];
            editor.setSetting(d.id, d.setting, n);
          } else {
            if (d.key)
              state.settingErrors[d.key] =
                min !== null && max !== null
                  ? `Enter a value from ${min} to ${max}.`
                  : min !== null
                    ? `Enter a value of at least ${min}.`
                    : max !== null
                      ? `Enter a value no greater than ${max}.`
                      : "Enter a valid number.";
            syncBlockPanel();
          }
        } else if (d.setting) {
          if (d.key) delete state.settingErrors[d.key];
          editor.setSetting(d.id, d.setting, input.value);
        } else if (d.field) {
          if (d.key) delete state.settingErrors[d.key];
          editor.setField(d.id, d.field, input.value);
        }
      },

      // --- media control (upload / URL / alt on image-carrier fields) --------
      // Writes go through setField with the FULL image object — the carrier
      // value is one fact; parts never write independently.
      async uploadMedia(d: Dataset, ctx: { event: Event }) {
        const input = ctx.event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ""; // same-file re-selects must fire change again
        if (!d.id || !d.field || !file) return;
        const { url } = await PublrEditor.putMedia(file, file.name);
        let width = "";
        let height = "";
        if (file.type.startsWith("image/")) {
          try {
            const bmp = await createImageBitmap(file);
            width = String(bmp.width);
            height = String(bmp.height);
            bmp.close();
          } catch {
            /* not decodable (e.g. some SVGs) — dims stay empty */
          }
        }
        const cur = imageValue(d.id, d.field);
        editor.setField(d.id, d.field, { src: url, alt: cur.alt, width, height });
      },
      applyMediaUrl(d: Dataset, ctx: { event: Event }) {
        const input = ctx.event.target as HTMLInputElement;
        if (!d.id || !d.field) return;
        const cur = imageValue(d.id, d.field);
        // external source: intrinsic dims are unknown — cleared, not stale
        editor.setField(d.id, d.field, {
          src: input.value.trim(),
          alt: cur.alt,
          width: "",
          height: "",
        });
      },
      applyMediaAlt(d: Dataset, ctx: { event: Event }) {
        const input = ctx.event.target as HTMLInputElement;
        if (!d.id || !d.field) return;
        const cur = imageValue(d.id, d.field);
        editor.setField(d.id, d.field, { ...cur, alt: input.value });
      },
      clearMedia(d: Dataset) {
        if (d.id && d.field)
          editor.setField(d.id, d.field, { src: "", alt: "", width: "", height: "" });
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
        if (d.blockType) insertFromLibrary(d.blockType); // panel stays open
      },
      libraryPickFirst() {
        const first = state.shelves[0]?.blocks[0];
        if (first) insertFromLibrary(first.type);
      },
      // --- patterns tab (left rail) -------------------------------------------
      pickPatternGroup(d: Dataset) {
        if (!d.group) return;
        // second click on the open group folds its flyout (toggling)
        state.patternGroup = state.patternGroup === d.group ? "" : d.group;
      },
      closePatternFlyout() {
        state.patternGroup = "";
        state.patternQuery = "";
      },
      pickPattern(d: Dataset) {
        if (d.pattern) insertFromLibrary(`pattern:${d.pattern}`); // pane stays open, like blocks
      },
      openPatternExplorer: () => openExplorer(),
      closePatternExplorer: closeExplorer,
      setExplorerGroup(d: Dataset) {
        if (d.group) state.explorerGroup = d.group;
      },
      explorerPick(d: Dataset) {
        if (!d.pattern) return;
        closeExplorer(); // first — so the insert's carrier focus wins the day
        insertFromLibrary(`pattern:${d.pattern}`);
      },
      // --- pattern identity (sidebar card + template editor) ------------------
      sidebarEditPattern() {
        // inner selections remapped to the root — edit THIS copy
        if (state.blockPatternRoot) openInstanceEditor(state.blockPatternRoot);
      },
      editDefinition(d: Dataset) {
        if (d.pattern) openTemplateEditor(d.pattern); // the library's edit affordance
      },
      editDefinitionFromExplorer(d: Dataset) {
        if (!d.pattern) return;
        closeExplorer(); // the dialog folds; the isolation mode takes over
        openTemplateEditor(d.pattern);
      },
      selectPatternChild(d: Dataset) {
        if (d.id) editor.selectBlock(d.id);
      },
      saveTemplate,
      cancelTemplate: closeTemplateEditor,
      // --- list view (left rail) ---------------------------------------------
      toggleTree: () => setTreeOpen(!state.treeOpen),
      closeTree() {
        setTreeOpen(false);
        document.getElementById("tree-toggle")?.focus();
      },
      setTreeTab(d: Dataset) {
        if (d.ttab) state.treeTab = d.ttab;
      },
      // Purely visual: flips the row's disclosure, never touches selection —
      // collapsing a container with an inner block selected must stick.
      treeToggle(d: Dataset) {
        if (d.id) state.treeExpanded[d.id] = !state.treeExpanded[d.id];
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
      // The icon sprite first: every <use href="#pbe-i-…"> below resolves
      // against it (one hidden <symbol> set, bindable refs — see icons.ts).
      mountIconSprite();
      canvasEl = el.querySelector<HTMLElement>("#canvas")!;
      wrapEl = el.querySelector<HTMLElement>(".wrap")!;

      // The SW registration resolves after first paint — re-derive the panel
      // so a selected media block's Upload button appears without reselecting.
      void mediaReady.then(() => syncBlockPanel());

      editor = createEditor({
        canvas: canvasEl,
        defaultBlock: "paragraph",
        groupBlock: "group", // Cmd+G wraps the selection in one of these
        theme: DEMO_THEME, // the demo SITE's curated theme (fixtures may override)
        styleBackend: INLINE_MODE ? inlineBackend : undefined, // ?inline (E2a)
        // Edit tracing in the console: ?debug in the URL, or `editor.debug = true`.
        debug: new URLSearchParams(location.search).has("debug"),
        onChange: () => {
          state.wireEditing = editor.serialize();
          state.wireData = editor.serialize({ pipeline: "data" });
          refreshEngineCss(); // E3: recompile the live class universe (debounced)
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
        // the toolbar's "Edit pattern" — edits THAT COPY in isolation
        onEditPattern: (_name, blockId) => openInstanceEditor(blockId),
        // the pickers' "Pattern" entry — the full pattern dialog, anchored
        // at the block the picker targeted (an empty default block there
        // gets REPLACED by the explorer's eventual pick)
        onBrowsePatterns: (anchorId) => openExplorer(anchorId),
      });

      // Library shelves ← search query, grouped by the registry's category
      // metadata; fixed shelf order, unknown categories trail.
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
          if (b.internal) continue; // parent-scoped types (list-item) never reach the inserter
          const it = asItem(b);
          if (!matches(it, q)) continue;
          const cat = b.category ?? "Text";
          if (!shelves.has(cat)) shelves.set(cat, []);
          shelves.get(cat)!.push(it);
        }
        // Blocks only — patterns are compositions, not blocks: they live in
        // the Patterns tab (group flyout + explorer), never on these shelves.
        state.shelves = [...shelves.entries()]
          .sort(([a], [z]) => rank(a) - rank(z))
          .map(([name, blocks]) => ({ name, blocks }));
        state.noResults = state.shelves.length === 0;
      });

      // Patterns tab: groups from the registry's category metadata ("All"
      // leads; selection highlights both here and in the explorer).
      effect(() => {
        void state.libraryEpoch;
        const names = ["All", ...new Set(patternTypes().map((p) => p.category ?? "Uncategorized"))];
        state.patternGroups = names.map((name) => ({
          name,
          selected: name === (state.patternGroup || null),
        }));
        state.explorerGroups = names.map((name) => ({
          name,
          selected: name === state.explorerGroup,
        }));
      });

      // Flyout contents: a typed search beats the group pick;
      // the pane shows whenever the Patterns tab has either.
      effect(() => {
        const q = state.patternQuery.trim().toLowerCase();
        const group = state.patternGroup;
        state.patternItems = patternTypes()
          .filter((p) =>
            q
              ? p.label.toLowerCase().includes(q) || p.name.includes(q)
              : group === "All" || (p.category ?? "Uncategorized") === group,
          )
          .map((p) => ({ name: p.name, label: p.label }));
        state.patternFlyoutTitle = q ? "Search results" : group;
        state.patternFlyoutOpen =
          state.inserterOpen && state.inserterTab === "patterns" && (!!q || !!group);
        state.patternNoResults = state.patternFlyoutOpen && state.patternItems.length === 0;
      });

      // Explorer contents: category narrows, search filters within it.
      effect(() => {
        const q = state.explorerQuery.trim().toLowerCase();
        const g = state.explorerGroup;
        state.explorerItems = patternTypes()
          .filter((p) => g === "All" || (p.category ?? "Uncategorized") === g)
          .filter((p) => !q || p.label.toLowerCase().includes(q) || p.name.includes(q))
          .map((p) => ({ name: p.name, label: p.label }));
        state.explorerNoResults = state.explorerItems.length === 0;
      });

      // Live previews are IMPERATIVE by necessity: PublrJS has no
      // HTML-injection binding (by design — same reason icons ride a sprite),
      // so the templates render empty card shells (data-pattern-preview) and
      // this pass fills each one once with the pattern's rendered fragment,
      // scaled to the card. Runs after the bindings flush (rAF).
      effect(() => {
        void state.patternItems;
        void state.explorerItems;
        void state.patternFlyoutOpen;
        void state.explorerOpen;
        requestAnimationFrame(fillPatternPreviews);
      });

      // List view rows: tracked via effect(syncTree) for the reactive reads
      // (selection highlight, collapse map) and called from onChange for
      // model edits — the model itself is NOT reactive by design.
      effect(syncTree);
      effect(syncOutline); // tracks docEpoch only — the outline ignores selection

      // Reveal the selection: selecting inside a collapsed container (from
      // the canvas) expands its ancestors so the highlight is visible.
      // Deliberately WRITE-ONLY on treeExpanded (no read → no subscription):
      // the effect re-runs on selection moves only, so manually collapsing a
      // container while an inner block stays selected sticks instead of
      // being re-expanded on the spot.
      effect(() => {
        const id = editor.selection.active ?? editor.selection.blocks[0];
        if (!id) return;
        const path = pathToBlock(editor.getModel().blocks, id);
        if (!path) return;
        for (const b of path.slice(0, -1)) state.treeExpanded[b.id] = true;
      });

      // Bridges: the editor's reactive selection → chrome's derived view state.
      effect(syncBlockPanel);
      effect(syncBreadcrumb);

      // Landing on a block opens the Block tab; deselecting falls back to
      // Document. Only selection TRANSITIONS switch — editing
      // the selected block, or manually picking a tab, never fights this.
      let prevTarget = "";
      effect(() => {
        const ids = editor.selection.blocks;
        // The STICKY target counts too: while focus transits to sidebar
        // chrome (mousedown blur → focusin), the live selection reads empty
        // for a tick — flipping to the Document tab then yanks the very
        // button being clicked out from under the pointer.
        const target =
          (editor.selection.active ?? (ids.length ? ids.join(" ") : "")) || (panelTarget() ?? "");
        if (target === prevTarget) return;
        prevTarget = target;
        state.sidebarTab = target ? "block" : "document";
      });

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
      // Full-bleed canvas for page-scale content (landing pages): the default
      // 660px article column keeps desktop media queries active while cramming
      // the layout, so a full page can't read faithfully. Triggered by ?wide OR
      // a `wide: true` fixture frontmatter (applied in the fixture .then).
      const setWide = () => {
        const wrap = document.querySelector(".wrap");
        wrap?.classList.remove("max-w-[660px]", "px-5", "pt-16", "text-[15px]", "leading-[1.6]");
        wrap?.classList.add("max-w-none", "px-0", "pt-0", "text-base", "leading-normal");
      };
      if (new URLSearchParams(location.search).has("wide")) setWide();

      // E3 boot: mount the injection targets, probe the dev jit bridge once.
      // Inline mode needs no engine at all — the theme's :root vars suffice.
      document.head.appendChild(engineTag);
      if (INLINE_MODE) {
        document.head.appendChild(inlineThemeTag);
        refreshInlineThemeCss();
        state.engineLabel = "inline backend — no engine needed";
      } else {
        // Prefer the self-contained wasm engine (JIT-in-a-Worker): it compiles
        // the live class universe with NO backend, so the canvas styles itself
        // on a static deploy too. Fall back to the dev /__jit bridge only if the
        // wasm can't load, then to build-time CSS.
        void probeWasmCssEngine()
          .then((wasm) =>
            wasm
              ? { engine: wasm, label: "live (wasm engine)" }
              : probeCssEngine("/__jit").then((bridge) => ({
                  engine: bridge,
                  label: bridge ? "live (dev jit bridge)" : "none — build-time CSS only",
                })),
          )
          .then(({ engine, label }) => {
            cssEngine = engine;
            state.engineActive = !!engine;
            state.engineLabel = label;
            if (engine) refreshEngineCss();
            syncDesignPanel();
          });
      }

      // ?fixture=<group>/<name> (the manual-test harness, manual.html) seeds
      // the shell from tests/manual/<id>.md's ```html fence instead — the md
      // is inlined at build time (fixtureFiles), so a fixture URL is directly
      // shareable and works on the deployed static demo, not just `vp dev`.
      const fixtureId = new URLSearchParams(location.search).get("fixture");
      if (fixtureId && /^[\w-]+(\/[\w-]+)+$/.test(fixtureId)) {
        const fixtureMd = fixtureFiles[`../tests/manual/${fixtureId}.md`];
        void (
          fixtureMd !== undefined
            ? Promise.resolve(fixtureMd)
            : Promise.reject(new Error("HTTP 404"))
        )
          .then((md) => {
            const fence = md.match(/^```html\r?\n([\s\S]*?)^```/m);
            if (!fence) throw new Error("no ```html fence");
            // `wide: true` in the fixture frontmatter → full-bleed canvas
            // (page-scale fixtures), without needing the ?wide URL param.
            if (/^wide:\s*true\s*$/m.test(md.split("```")[0])) setWide();
            // Optional ```json fences configure the run: one with a `tokens`
            // key is the SITE THEME (E1 — replaces the demo theme so a fixture
            // can grow/shrink the control scales); any other is the editor
            // POLICY — applied as config, never read off the fixture HTML
            // (thoughts/010). JSON.parse tolerates the formatter's reflow;
            // applied before load so the first render already carries both.
            for (const m of md.matchAll(/^```json\r?\n([\s\S]*?)^```/gm)) {
              try {
                const parsed: unknown = JSON.parse(m[1]);
                if (parsed && typeof parsed === "object" && "tokens" in parsed) {
                  // {"tokens": "default"} = the full vendored Tailwind default
                  // (fixtures carrying real-world templates need the whole
                  // palette, not the demo's curated subset).
                  const t = (parsed as { tokens: Record<string, string> | "default" }).tokens;
                  setActiveTheme(t === "default" ? DEFAULT_THEME : themeFromTokens(t));
                  refreshInlineThemeCss();
                  syncDesignPanel();
                } else {
                  editor.setPolicy(parsed as PublrEditor.PolicyConfig);
                }
              } catch (e) {
                console.warn("[manual] ignoring invalid json fence:", e);
              }
            }
            editor.loadHtml(dedent(fence[1]));
            // Compile the loaded content NOW (belt-and-suspenders vs the
            // probe/load race): if the engine is already up, style it
            // immediately instead of waiting for the next edit.
            refreshEngineCss();
          })
          .catch((err: unknown) => {
            editor.loadHtml(
              `<p data-pb-block="paragraph" data-pb-rich="body">Fixture <code>${fixtureId}</code> failed to load: ${String(err instanceof Error ? err.message : err)}</p>`,
            );
          });
      } else {
        editor.loadHtml(dedent(document.getElementById("seed")!.innerHTML));
      }

      return () => document.removeEventListener("selectionchange", onSelectionChange);
    },
  };
});
