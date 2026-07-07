// extract-icons.mjs — regenerate src/icons.ts from @wordpress/icons.
//
//   npm run icons
//
// @wordpress/icons ships React elements; we render them to static markup at
// BUILD time and keep only the SVG bodies — React never reaches the bundle.
// Same vendoring philosophy as vendor/publr: the generated file is checked
// in, this script is the only writer. Add icons by extending NAMES.
//
// License note: @wordpress/icons is GPL-2.0-or-later — an interim set until
// Publr has its own icons.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server");
const wp = require("@wordpress/icons");
const version = require("@wordpress/icons/package.json").version;

// ours → @wordpress/icons export. Kebab-case keys — they double as sprite
// symbol ids (#pbe-i-<name>).
const NAMES = {
  paragraph: "paragraph",
  heading: "heading",
  quote: "quote",
  code: "code",
  group: "group",
  row: "row",
  stack: "stack",
  grid: "grid",
  html: "html",
  "heading-level-1": "headingLevel1",
  "heading-level-2": "headingLevel2",
  "heading-level-3": "headingLevel3",
  "heading-level-4": "headingLevel4",
  "heading-level-5": "headingLevel5",
  "heading-level-6": "headingLevel6",
  preformatted: "preformatted",
  pullquote: "pullquote",
  verse: "verse",
  table: "table",
  details: "details",
  math: "math",
  list: "list",
  "list-item": "listItem",
  "list-unordered": "formatListBullets",
  "list-ordered": "formatListNumbered",
  image: "image",
  video: "video",
  audio: "audio",
  cover: "cover",
  gallery: "gallery",
  file: "file",
  "media-text": "mediaAndText",
  symbol: "symbol",
  button: "button",
  buttons: "buttons",
  separator: "separator",
  spacer: "resizeCornerNE",
  section: "category",
  columns: "columns",
  column: "column",
  accordion: "tableRowAfter",
  globe: "globe",
  share: "share",
  envelope: "envelope",
  pencil: "pencil",
  send: "send",
  megaphone: "megaphone",
};

const entries = Object.entries(NAMES).map(([ours, theirs]) => {
  const el = wp[theirs];
  if (!el) throw new Error(`@wordpress/icons has no export "${theirs}"`);
  const markup = renderToStaticMarkup(el);
  const m = markup.match(/^<svg[^>]*\bviewBox="([^"]+)"[^>]*>(.*)<\/svg>$/s);
  if (!m) throw new Error(`unexpected markup for "${theirs}": ${markup}`);
  const [, viewBox, body] = m;
  if (viewBox !== "0 0 24 24")
    throw new Error(`"${theirs}" viewBox is ${viewBox} — the set assumes 24x24`);
  return [ours, body];
});

const out = `// GENERATED FILE — do not edit. Regenerate: npm run icons
// (scripts/extract-icons.mjs). Extracted from @wordpress/icons v${version}
// (GPL-2.0-or-later) — React elements rendered to static SVG bodies at build
// time; React itself never ships. An INTERIM icon set until Publr has its own.
//
// All bodies assume viewBox "0 0 24 24" (the extractor enforces it) and
// inherit currentColor (WP paths carry no fill).

export const ICON_VIEWBOX = "0 0 24 24";

export const ICONS: Record<string, string> = {
${entries.map(([n, body]) => `  ${JSON.stringify(n)}: ${JSON.stringify(body)},`).join("\n")}
};

/** One inline icon as a self-contained SVG string (imperative chrome). */
export const iconSvg = (name: string, cls = "h-6 w-6"): string =>
  name in ICONS
    ? \`<svg class="\${cls} fill-current" viewBox="\${ICON_VIEWBOX}" aria-hidden="true">\${ICONS[name]}</svg>\`
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
  host.innerHTML = \`<svg id="pbe-icon-sprite" style="display:none" aria-hidden="true">\${Object.entries(
    ICONS,
  )
    .map(([n, body]) => \`<symbol id="pbe-i-\${n}" viewBox="\${ICON_VIEWBOX}">\${body}</symbol>\`)
    .join("")}</svg>\`;
  doc.body.appendChild(host.firstElementChild!);
}

/** Sprite reference for a known icon name, "" otherwise (chrome shows a letter fallback). */
export const iconRef = (name: string | undefined): string =>
  name && name in ICONS ? \`#pbe-i-\${name}\` : "";
`;

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../src/icons.ts");
writeFileSync(dest, out);
console.log(`wrote ${dest} — ${entries.length} icons from @wordpress/icons v${version}`);
