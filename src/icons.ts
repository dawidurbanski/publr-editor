// Publr's own icon set — original artwork, hand-authored in-house (2026).
// Style: 24×24 grid, 1.5px strokes, round caps/joins, currentColor.
// Not derived from any third-party icon library.
//
// All bodies assume viewBox "0 0 24 24". Most icons are stroke-drawn via the
// `s()` wrapper; solid accents (bullets, play triangles) opt into fill inline.

export const ICON_VIEWBOX = "0 0 24 24";

/** Wrap a body in the shared stroke style. */
const s = (body: string): string =>
  `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

/** A solid dot accent (list bullets etc.). */
const dot = (cx: number, cy: number, r = 1.4): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

export const ICONS: Record<string, string> = {
  // ---- text -----------------------------------------------------------
  paragraph: s(
    '<path d="M11.25 19V5h5.5"/><path d="M14.75 19V5"/><path d="M11.25 12.5a3.75 3.75 0 0 1 0-7.5"/>',
  ),
  // A bookmark — the classic "heading/anchor" glyph.
  heading: s('<path d="M7 4.5h10V19.5l-5-4.1-5 4.1z"/>'),
  // Solid comma-style quotation marks (fill inherits currentColor).
  quote:
    '<path d="M10.75 6.75c-3.4.6-5.25 2.9-5.25 6.3v4.2h5v-5.1H8.1c.3-1.55 1.2-2.5 2.65-2.95z"/>' +
    '<path d="M18.5 6.75c-3.4.6-5.25 2.9-5.25 6.3v4.2h5v-5.1h-2.4c.3-1.55 1.2-2.5 2.65-2.95z"/>',
  code: s('<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M13.5 5.5l-3 13"/>'),
  html: s(
    '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M10 9.5L7.5 12l2.5 2.5"/><path d="M14 9.5l2.5 2.5L14 14.5"/>',
  ),
  preformatted: s(
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 9h6"/><path d="M7 12.25h9.5"/><path d="M7 15.5h4"/>',
  ),
  // Rules above/below the same solid quote marks as `quote` (scaled 0.7).
  pullquote:
    s('<path d="M4 4.5h16"/><path d="M4 19.5h16"/>') +
    '<path d="M11.1 8.35c-2.4.4-3.7 2.05-3.7 4.4v2.95h3.5v-3.55H9.25c.2-1.1.85-1.75 1.85-2.1z"/>' +
    '<path d="M16.55 8.35c-2.4.4-3.7 2.05-3.7 4.4v2.95h3.5v-3.55h-1.65c.2-1.1.85-1.75 1.85-2.1z"/>',
  verse: s(
    '<path d="M19.5 4.5c-6 .75-10 4.5-11.25 10.5L6 19.5"/><path d="M8.5 14.5c3.5-.5 7.5-2.5 9.5-6.5"/>',
  ),
  table: s(
    '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17"/><path d="M3.5 14.75h17"/><path d="M12 10v9.5"/>',
  ),
  details:
    '<path d="M5 5l4.25 2.6L5 10.2z" fill="currentColor" stroke="none"/>' +
    s('<path d="M12.5 7.5H20"/><path d="M4 13h16"/><path d="M4 17.5h16"/>'),
  math: s(
    '<path d="M7.25 4.75v5"/><path d="M4.75 7.25h5"/><path d="M14.25 7.25h5"/><path d="M5.5 14.5l3.5 3.5"/><path d="M9 14.5l-3.5 3.5"/><path d="M14.25 16.5h5"/>' +
      dot(16.75, 13.9, 1) +
      dot(16.75, 19.1, 1),
  ),

  // ---- lists ----------------------------------------------------------
  list: s(
    dot(5, 6) +
      dot(5, 12) +
      dot(5, 18) +
      '<path d="M9.5 6h10.5"/><path d="M9.5 12h10.5"/><path d="M9.5 18h10.5"/>',
  ),
  "list-item": s(dot(6, 12) + '<path d="M10.5 12h9.5"/>'),
  "list-unordered": s(dot(5.5, 8) + dot(5.5, 16) + '<path d="M10.5 8H20"/><path d="M10.5 16H20"/>'),
  "list-ordered": s(
    '<path d="M4.5 6.25L6 5.25v5"/><path d="M4.5 14.75c.15-1 .95-1.6 1.85-1.5.85.1 1.5.8 1.4 1.65-.05.55-.45 1-.95 1.5L4.5 18.75h3.6"/><path d="M11 7.75h9"/><path d="M11 16.25h9"/>',
  ),

  // ---- media ----------------------------------------------------------
  image: s(
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.75" cy="9.25" r="1.5"/><path d="M3.5 16.5l4.5-4 3.75 3.25L15 13l5.5 4.5"/>',
  ),
  video:
    s('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>') +
    '<path d="M10.25 9.25l4.75 2.75-4.75 2.75z" fill="currentColor" stroke="none"/>',
  audio: s(dot(7.4, 17, 2.3) + '<path d="M9.7 17V6.5"/><path d="M9.7 6.5c3 .5 4.9 2 5.4 4.5"/>'),
  cover: s(
    '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="8.5" cy="8.25" r="1.4"/><path d="M7 14.75h10"/><path d="M9 17.75h6"/>',
  ),
  gallery: s(
    '<path d="M7 6V5.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H18"/><rect x="3.5" y="7" width="14" height="13.5" rx="2"/><path d="M3.5 16.75l3.5-3 3 2.5 2.75-2.25 4.75 3.75"/>',
  ),
  file: s(
    '<path d="M13.75 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.75z"/><path d="M13.75 3.5v5.25H19"/>',
  ),
  "media-text": s(
    '<rect x="3.5" y="7" width="8" height="10" rx="1.5"/><path d="M14.75 9h5.75"/><path d="M14.75 12h5.75"/><path d="M14.75 15h5.75"/>',
  ),

  // ---- layout ---------------------------------------------------------
  group: s('<rect x="4" y="4" width="11" height="11" rx="2"/><path d="M9 20h9a2 2 0 0 0 2-2V9"/>'),
  row: s(
    '<rect x="3.5" y="7" width="7.75" height="10" rx="1.5"/><rect x="12.75" y="7" width="7.75" height="10" rx="1.5"/>',
  ),
  stack: s(
    '<rect x="4.5" y="4" width="15" height="7.25" rx="1.5"/><rect x="4.5" y="12.75" width="15" height="7.25" rx="1.5"/>',
  ),
  grid: s(
    '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  ),
  columns: s(
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="M14.5 4.5v15"/>',
  ),
  column: s(
    '<rect x="8.5" y="4.5" width="7" height="15" rx="1.5"/><path d="M4.5 6.5v11"/><path d="M19.5 6.5v11"/>',
  ),
  accordion: s(
    '<rect x="3.5" y="3.75" width="17" height="4.25" rx="1"/><rect x="3.5" y="10.5" width="17" height="9.75" rx="1"/><path d="M12 13.25v4.25"/><path d="M9.875 15.375h4.25"/>',
  ),
  separator: s('<path d="M3.5 12h17"/><path d="M9 7.5h6"/><path d="M9 16.5h6"/>'),
  spacer: s(
    '<path d="M12 4.75v14.5"/><path d="M8.75 8L12 4.75 15.25 8"/><path d="M8.75 16L12 19.25 15.25 16"/>',
  ),

  // ---- interactive / misc ---------------------------------------------
  button: s('<rect x="3.5" y="8" width="17" height="8" rx="2.5"/><path d="M8 12h8"/>'),
  buttons: s(
    '<rect x="3.5" y="4.5" width="17" height="6.5" rx="2"/><rect x="3.5" y="13" width="17" height="6.5" rx="2"/><path d="M8 7.75h8"/><path d="M8 16.25h8"/>',
  ),
  // The icon block: circle / cross / triangle / square — raw geometric
  // primitives standing in for "any glyph", one per quadrant.
  icon: s(
    '<circle cx="7.25" cy="7.25" r="3.75"/><path d="M13.75 4.5l5.75 5.75"/><path d="M19.5 4.5l-5.75 5.75"/><path d="M3.5 19.75l3.75-6.5 3.75 6.5z"/><rect x="13.5" y="13.25" width="6.5" height="6.5" rx="1.5"/>',
  ),
  // A pattern: an asymmetric collage of composed blocks (layout thumbnail).
  pattern: s(
    '<rect x="3.5" y="4.5" width="9" height="15" rx="1.5"/><rect x="15" y="4.5" width="5.5" height="6.25" rx="1.5"/><rect x="15" y="13.25" width="5.5" height="6.25" rx="1.5"/>',
  ),
  // A "component": four instances composed around a center, design-tool style.
  // Reserved for the future symbol concept (synced, parameterized patterns).
  symbol: s(
    '<path d="M12 4l2.75 2.75L12 9.5 9.25 6.75z"/><path d="M6.75 9.25L9.5 12l-2.75 2.75L4 12z"/><path d="M17.25 9.25L20 12l-2.75 2.75L14.5 12z"/><path d="M12 14.5l2.75 2.75L12 20l-2.75-2.75z"/>',
  ),
  globe: s(
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c-3 2.4-4.5 5.4-4.5 8.5s1.5 6.1 4.5 8.5c3-2.4 4.5-5.4 4.5-8.5S15 5.9 12 3.5z"/>',
  ),
  share: s(
    '<circle cx="6.5" cy="12" r="2.5"/><circle cx="17" cy="5.75" r="2.5"/><circle cx="17" cy="18.25" r="2.5"/><path d="M8.7 10.7l6.1-3.65"/><path d="M8.7 13.3l6.1 3.65"/>',
  ),

  // ---- editor harness (toolbar, panels, tree) ---------------------------
  plus: s('<path d="M12 5.25v13.5"/><path d="M5.25 12h13.5"/>'),
  close: s('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  undo: s(
    '<path d="M7.75 6.25L4 10l3.75 3.75"/><path d="M4 10h10.5a5.25 5.25 0 0 1 5.25 5.25v2.25"/>',
  ),
  redo: s(
    '<path d="M16.25 6.25L20 10l-3.75 3.75"/><path d="M20 10H9.5a5.25 5.25 0 0 0-5.25 5.25v2.25"/>',
  ),
  "list-view": s('<path d="M4 6.5h9.5"/><path d="M10.5 12h9.5"/><path d="M4 17.5h9.5"/>'),
  external: s(
    '<path d="M11 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/><path d="M13.75 4.5h5.75v5.75"/><path d="M19.5 4.5L11.75 12.25"/>',
  ),
  search: s('<circle cx="10.75" cy="10.75" r="6.25"/><path d="M15.5 15.5L20 20"/>'),
  "chevron-right": s('<path d="M9.5 6l6 6-6 6"/>'),
  "chevron-down": s('<path d="M6 9.5l6 6 6-6"/>'),
  "chevron-up": s('<path d="M6 14.5l6-6 6 6"/>'),
  more: dot(12, 5.75) + dot(12, 12) + dot(12, 18.25),
  link: s(
    '<path d="M13.75 10.25a3.5 3.5 0 0 1 0 4.95l-2.55 2.55a3.5 3.5 0 0 1-4.95-4.95l1.3-1.3"/><path d="M10.25 13.75a3.5 3.5 0 0 1 0-4.95l2.55-2.55a3.5 3.5 0 0 1 4.95 4.95l-1.3 1.3"/>',
  ),
  caption: s('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7 15.5h10"/>'),

  // ---- block & formatting actions ---------------------------------------
  bold: '<g fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5h5a3.5 3.5 0 0 1 0 7H8z"/><path d="M8 12h6a3.5 3.5 0 0 1 0 7H8z"/></g>',
  italic: s('<path d="M10.5 5h6.5"/><path d="M7 19h6.5"/><path d="M13.75 5l-4 14"/>'),
  // Group: a dashed frame collecting two blocks.
  "group-blocks": s(
    '<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="2" stroke-dasharray="3.1 2.6"/><rect x="7.25" y="7.25" width="4.25" height="9.5" rx="1"/><rect x="14" y="7.25" width="2.75" height="9.5" rx="1"/>',
  ),
  // Ungroup: one block escaping the dashed frame.
  ungroup: s(
    '<rect x="3.75" y="7" width="13.25" height="13.25" rx="2" stroke-dasharray="3.1 2.6"/><rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1"/>',
  ),
  trash: s(
    '<path d="M4.75 6.5h14.5"/><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5"/><path d="M6.25 6.5l.7 12.05A2 2 0 0 0 8.95 20.5h6.1a2 2 0 0 0 2-1.95l.7-12.05"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/>',
  ),
  duplicate: s(
    '<rect x="8.75" y="8.75" width="11.25" height="11.25" rx="2"/><path d="M15.25 5.25V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.25a2 2 0 0 0 2 2h.25"/>',
  ),
  // Reset: a counterclockwise restore arrow.
  reset: s('<path d="M4.75 4.75V9.5h4.75"/><path d="M4.75 9.5a7.5 7.5 0 1 1-.65 4.75"/>'),
  // Mark as decorative: hidden from assistive tech — a crossed-out eye.
  decorative: s(
    '<path d="M4 12c1.9-3.4 4.6-5.25 8-5.25S18.1 8.6 20 12c-1.9 3.4-4.6 5.25-8 5.25S5.9 15.4 4 12z"/><circle cx="12" cy="12" r="2.25"/><path d="M5.75 18.25L18.25 5.75"/>',
  ),
  // Replace: two opposing swap arrows.
  replace: s(
    '<path d="M4.5 8h13"/><path d="M14.75 5.25L17.5 8l-2.75 2.75"/><path d="M19.5 16h-13"/><path d="M9.25 13.25L6.5 16l2.75 2.75"/>',
  ),

  // ---- heading levels ---------------------------------------------------
  "heading-level-1": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M15.5 8.25l2.25-1.75v11"/>',
  ),
  "heading-level-2": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M14.5 9.25c.2-1.6 1.5-2.75 3-2.75 1.65 0 2.9 1.2 2.9 2.8 0 1-.5 1.85-1.45 2.8l-4.45 5.4h6"/>',
  ),
  "heading-level-3": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M14.75 8c.6-.95 1.65-1.5 2.9-1.5 1.7 0 2.95 1 2.95 2.5 0 1.35-1 2.25-2.4 2.5 1.5.2 2.7 1.1 2.7 2.7 0 1.7-1.45 2.8-3.25 2.8-1.35 0-2.45-.55-3.1-1.5"/>',
  ),
  "heading-level-4": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M18.75 6.5l-4.25 7.25h6.25"/><path d="M18.75 6.5v11"/>',
  ),
  "heading-level-5": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M20 6.5h-4.75l-.5 5c.6-.55 1.4-.85 2.3-.85 1.9 0 3.2 1.35 3.2 3.25s-1.45 3.35-3.35 3.35c-1.3 0-2.4-.6-3-1.55"/>',
  ),
  "heading-level-6": s(
    '<path d="M4 6.5v11"/><path d="M10.5 6.5v11"/><path d="M4 12h6.5"/><path d="M19.9 7.1c-.55-.45-1.25-.7-2.05-.7-2.2 0-3.6 1.85-3.6 4.6v2.9c0 2.05 1.45 3.5 3.3 3.5s3.3-1.45 3.3-3.3-1.45-3.3-3.3-3.3c-1.55 0-2.85 1-3.3 2.4"/>',
  ),
};

/** One inline icon as a self-contained SVG string (imperative chrome). */
export const iconSvg = (name: string, cls = "h-6 w-6"): string =>
  name in ICONS
    ? `<svg class="${cls} fill-current" viewBox="${ICON_VIEWBOX}" aria-hidden="true">${ICONS[name]}</svg>`
    : "";

/**
 * Mount the set once as a hidden <symbol> sprite; declarative chrome then
 * renders any icon as <svg><use href="#pbe-i-<name>"> — the href is a plain
 * bindable attribute, which is what data-p-bind can drive (PublrJS has no
 * HTML-injection binding, by design).
 */
export function mountIconSprite(doc: Document = document): void {
  if (doc.getElementById("pbe-icon-sprite")) return;
  const host = doc.createElement("div");
  host.innerHTML = `<svg id="pbe-icon-sprite" style="display:none" aria-hidden="true">${Object.entries(
    ICONS,
  )
    .map(([n, body]) => `<symbol id="pbe-i-${n}" viewBox="${ICON_VIEWBOX}">${body}</symbol>`)
    .join("")}</svg>`;
  doc.body.appendChild(host.firstElementChild!);
}

/** Sprite reference for a known icon name, "" otherwise (chrome shows a letter fallback). */
export const iconRef = (name: string | undefined): string =>
  name && name in ICONS ? `#pbe-i-${name}` : "";
