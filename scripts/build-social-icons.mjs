// Regenerate src/blocks/social-icons.ts from the checked-in SVG sources in
// assets/social-icons/. Each file's INNER markup is embedded verbatim; the
// filename (minus .svg) is the service slug. Run: npm run icons:social
import fs from "node:fs";
import path from "node:path";

const SRC = "assets/social-icons";
const OUT = "src/blocks/social-icons.ts";

const files = fs
  .readdirSync(SRC)
  .filter((f) => f.endsWith(".svg"))
  .sort();
// Keep a stable, deliberate order: generics first, then brands alphabetically.
const ORDER = ["chain", "mail", "feed"];
files.sort((a, b) => {
  const ia = ORDER.indexOf(path.basename(a, ".svg"));
  const ib = ORDER.indexOf(path.basename(b, ".svg"));
  return (ia === -1 ? ORDER.length : ia) - (ib === -1 ? ORDER.length : ib) || a.localeCompare(b);
});

let out = `// GENERATED FILE — do not edit. Regenerate: npm run icons:social
// (scripts/build-social-icons.mjs ← assets/social-icons/*.svg).
//
// Generic glyphs (chain, mail, feed): original Publr artwork, hand-authored
// in the src/icons.ts house style (1.5px strokes, round caps).
// Brand marks: path data from Simple Icons (https://simpleicons.org),
// released under CC0 1.0 (public domain) — no GPL code. The logos themselves
// remain trademarks of their respective owners and are used nominatively to
// identify the linked service.

/** service slug → SVG inner markup (24x24, currentColor). */
export const SOCIAL_ICON_BODIES: Record<string, string> = {
`;
for (const f of files) {
  const name = path.basename(f, ".svg");
  const svg = fs.readFileSync(path.join(SRC, f), "utf8");
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .trim();
  if (!body) throw new Error(`${f}: empty body`);
  if (body.includes("'")) throw new Error(`${f}: single quote in body`);
  out += `  ${/^[a-z][a-z0-9]*$/.test(name) ? name : JSON.stringify(name)}:\n    '${body}',\n`;
}
out += `};

export const SOCIAL_SERVICES = Object.keys(SOCIAL_ICON_BODIES);
`;
fs.writeFileSync(OUT, out);
console.log(`${OUT}: ${files.length} icons`);
