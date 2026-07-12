// theme.ts — the THEME DOCUMENT (css-engine thoughts, E1). A theme is a flat
// list of {name, value} tokens whose names follow Tailwind v4's @theme
// CSS-custom-property convention (jit THEME.md): `text-lg`, `color-red-500`,
// `radius-xl`, `spacing`, `text-lg--line-height` (a `--` modifier). The theme
// is SITE DATA — the same tokens the CSS engine compiles against populate the
// editor's style controls, so control options DERIVE from tokens: adding a
// `text-xxxxl` token grows the Font size control. No scale is hardcoded in
// editor source; the vendored default (generated from the jit's
// default-theme.zon by scripts/vendor-theme.mjs — never hand-edited) is the
// 1:1 Tailwind default a site starts from.

import { DEFAULT_THEME_TOKENS } from "../vendor/theme/default-theme";

/** One theme token: a Tailwind v4 @theme custom property, sans leading `--`. */
export interface ThemeToken {
  name: string;
  value: string;
}

/** A theme: the flat token list. Order is meaningful (scales render in order). */
export interface Theme {
  tokens: ThemeToken[];
}

/** The vendored Tailwind-default theme — what a site gets before it has one. */
export const DEFAULT_THEME: Theme = { tokens: DEFAULT_THEME_TOKENS };

// The PAGE-active theme. A theme is SITE data and a page is one site — every
// editor instance on a page (the PublrInlineEditor many-instances case)
// resolves against the same theme, so this is page-scoped by design, not an
// accident. createEditor({ theme }) sets it; E2's backend seam formalizes
// ownership.
let active: Theme = DEFAULT_THEME;

/** The theme style serialization + controls currently resolve against. */
export const activeTheme = (): Theme => active;

/** Install the site theme (undefined restores the Tailwind default). */
export function setActiveTheme(theme: Theme | undefined): void {
  active = theme ?? DEFAULT_THEME;
}

// Lookup maps are cached per theme object — themes are replaced, not mutated
// (same convention as the frozen registry).
const maps = new WeakMap<Theme, Map<string, string>>();
function map(theme: Theme): Map<string, string> {
  let m = maps.get(theme);
  if (!m) {
    m = new Map(theme.tokens.map((t) => [t.name, t.value]));
    maps.set(theme, m);
  }
  return m;
}

/** Raw value of a token, or undefined. */
export function tokenValue(theme: Theme, name: string): string | undefined {
  return map(theme).get(name);
}

/** Whether the theme defines a token. */
export function hasToken(theme: Theme, name: string): boolean {
  return map(theme).has(name);
}

/** Build a theme from a name→value record (tests, curated site themes). */
export function themeFromTokens(tokens: Record<string, string>): Theme {
  return { tokens: Object.entries(tokens).map(([name, value]) => ({ name, value })) };
}

/** One option a scale control offers: the token KEY (= utility-class suffix,
 * what the model stores), and the raw value for previews/tooltips. */
export interface ScaleOption {
  key: string;
  value: string;
}

// A namespace scan: tokens named `<prefix><key>`, skipping `--` modifiers
// (they belong to their base token) and any longer namespace that shadows
// this prefix (e.g. `text-shadow-*` inside `text-*`).
function scale(theme: Theme, prefix: string, exclude: readonly string[] = []): ScaleOption[] {
  const out: ScaleOption[] = [];
  for (const t of theme.tokens) {
    if (!t.name.startsWith(prefix) || t.name.includes("--")) continue;
    if (exclude.some((e) => t.name.startsWith(e))) continue;
    out.push({ key: t.name.slice(prefix.length), value: t.value });
  }
  return out;
}

/** Font sizes: `text-*` tokens (default: xs…9xl). `text-shadow-*` shares the
 * prefix and is excluded; `--line-height` modifiers ride their base token. */
export const fontSizes = (theme: Theme): ScaleOption[] => scale(theme, "text-", ["text-shadow-"]);

/** A color swatch: key is the class suffix (`red-500`), family/step split out
 * for grid layouts (single-name colors like a curated `color-brand` have no step). */
export interface ColorOption extends ScaleOption {
  family: string;
  step?: string;
}

/** Palette: `color-*` tokens, family-and-step split per the v4 naming rule
 * (`color-<family>-<step>` where step is numeric; anything else is a bare name). */
export function colors(theme: Theme): ColorOption[] {
  return scale(theme, "color-").map((o) => {
    const m = /^(.+)-(\d+)$/.exec(o.key);
    return m ? { ...o, family: m[1], step: m[2] } : { ...o, family: o.key };
  });
}

/** Border radii: `radius-*` tokens (default: xs…4xl). */
export const radii = (theme: Theme): ScaleOption[] => scale(theme, "radius-");

/** Line heights: `leading-*` tokens (default: tight…loose). */
export const leadings = (theme: Theme): ScaleOption[] => scale(theme, "leading-");

/** Letter spacings: `tracking-*` tokens (default: tighter…widest). */
export const trackings = (theme: Theme): ScaleOption[] => scale(theme, "tracking-");

/** The v4 spacing MULTIPLIER (`--spacing`): `p-4` = 4 × this. Spacing has no
 * per-step tokens by design — the scale is numeric. */
export const spacingBase = (theme: Theme): string | undefined => tokenValue(theme, "spacing");

/** Spacing steps the demo controls offer — a UI affordance, NOT theme data
 * (any number is a valid step; the model stores whatever it's given). */
export const SPACING_STEPS: readonly string[] = ["0", "1", "2", "4", "6", "8", "12", "16"];

/** Border-width steps — same status as SPACING_STEPS: v4 border widths are
 * fixed utilities (`border`, `border-2/4/8`), not theme tokens. "1" ⇒ `border`. */
export const BORDER_WIDTH_STEPS: readonly string[] = ["1", "2", "4", "8"];

// --- @theme CSS import/export (E4) -------------------------------------------
//
// Tailwind v4 config is CSS-first: a site's theme IS an `@theme { --token:
// value; }` block. Import parses exactly those blocks (custom properties
// anywhere else are NOT theme tokens); export writes one back — so a site's
// theme document stays interchangeable with any external Tailwind toolchain.

/** Parse the `@theme` blocks out of a CSS text → a Theme (null: none found). */
export function themeFromCssText(css: string): Theme | null {
  const tokens: ThemeToken[] = [];
  for (const block of css.matchAll(/@theme[^{]*\{([^}]*)\}/g)) {
    for (const decl of block[1].matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
      tokens.push({ name: decl[1], value: decl[2].trim() });
    }
  }
  return tokens.length ? { tokens } : null;
}

/** Serialize a theme as v4 `@theme` CSS (or a plain `:root` block for the
 * inline backend's published form). */
export function themeToCssText(theme: Theme, selector: "@theme" | ":root" = "@theme"): string {
  const body = theme.tokens.map((t) => `  --${t.name}: ${t.value};`).join("\n");
  return `${selector} {\n${body}\n}`;
}
