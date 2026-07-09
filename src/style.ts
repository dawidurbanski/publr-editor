// style.ts — the UNIVERSAL style system (Phase C). Distinct from per-block
// config settings: styles (color/typography/dimensions/border) are universal —
// any block that SUPPORTS a panel gets it, and ONE serializer emits the Tailwind
// utility classes for every block type (never per-block render logic).
//
// The structured value is the source of truth (block.style, an island that
// round-trips); this maps it to classes on the block root. The value VOCABULARY
// is Tailwind-native (E1, css-engine thoughts): a value is a THEME TOKEN key
// (`fontSize: "lg"` → text-lg, `textColor: "red-500"` → text-red-500, spacing
// steps are numeric: `padding: "4"` → p-4) or raw CSS, which becomes an
// arbitrary-value utility (`fontSize: "17px"` → text-[17px]) for the JIT.
// Scales are NOT hardcoded here — token membership is the theme's call
// (src/theme.ts); control options derive from the same tokens. Adding a prop =
// one STYLE_PROPS entry + one PROP_SUPPORT line. thoughts/011 + css-engine.

import { activeTheme, hasToken } from "./theme";
import type { Theme } from "./theme";

/** A block's structured style values: prop name → value (theme token key,
 * numeric step, or raw CSS). */
export type StyleValues = Record<string, string>;

/** Which style panels a block opts into (registerBlock `supports`). Grows per phase. */
export interface StyleSupports {
  typography?: {
    fontSize?: boolean;
    lineHeight?: boolean;
    letterSpacing?: boolean;
    decoration?: boolean;
    letterCase?: boolean;
  };
  color?: { text?: boolean; background?: boolean };
  spacing?: { padding?: boolean; margin?: boolean };
  border?: { width?: boolean; color?: boolean; radius?: boolean };
}

// One style prop: which panel it belongs to + how a value becomes a class
// against a given theme (token → its utility, else arbitrary-value). null = none.
interface StyleProp {
  panel: keyof StyleSupports;
  toClass: (value: string, theme: Theme) => string | null;
}

/** Keyword utilities (not theme scales — they ARE the spec): decoration + case. */
export const DECORATIONS = [
  { key: "underline", label: "U", class: "underline" },
  { key: "strike", label: "S", class: "line-through" },
] as const;
export const LETTER_CASES = [
  { key: "upper", label: "AB", class: "uppercase" },
  { key: "lower", label: "ab", class: "lowercase" },
  { key: "caps", label: "Ab", class: "capitalize" },
] as const;

const KEYWORD_CLASS: Record<string, string> = Object.fromEntries(
  [...DECORATIONS, ...LETTER_CASES].map((k) => [k.key, k.class]),
);

// Numeric steps (v4 spacing multiplier / border widths) — "4", "1.5".
const NUM = /^\d+(\.\d+)?$/;

// value → class for a color-consuming prefix: theme token (`red-500` →
// text-red-500) or raw CSS color (`#ff0000` → text-[#ff0000]).
const colorClass =
  (prefix: string) =>
  (v: string, theme: Theme): string | null =>
    v ? (hasToken(theme, `color-${v}`) ? `${prefix}-${v}` : `${prefix}-[${v}]`) : null;

// value → class for a token namespace: `lg` → text-lg if the theme has
// text-lg, else arbitrary (`17px` → text-[17px]). utility and namespace
// differ where Tailwind's class prefix ≠ the token prefix (rounded/radius).
const tokenClass =
  (utility: string, ns: string) =>
  (v: string, theme: Theme): string | null =>
    v ? (hasToken(theme, `${ns}-${v}`) ? `${utility}-${v}` : `${utility}-[${v}]`) : null;

// value → class for the numeric spacing scale: any number is a step
// (`p-4`, `m-1.5`); anything else is a raw length (`p-[3px]`).
const stepClass =
  (prefix: string) =>
  (v: string): string | null =>
    v ? (NUM.test(v) ? `${prefix}-${v}` : `${prefix}-[${v}]`) : null;

// The style vocabulary. Each prop maps a value → class against the theme.
export const STYLE_PROPS: Record<string, StyleProp> = {
  fontSize: { panel: "typography", toClass: tokenClass("text", "text") },
  textColor: { panel: "color", toClass: colorClass("text") },
  backgroundColor: { panel: "color", toClass: colorClass("bg") },
  padding: { panel: "spacing", toClass: stepClass("p") },
  margin: { panel: "spacing", toClass: stepClass("m") },
  borderWidth: {
    panel: "border",
    // v4 border widths are fixed utilities: "1" ⇒ `border`, other numbers ⇒
    // `border-N`, raw lengths ⇒ arbitrary.
    toClass: (v) =>
      v ? (v === "1" ? "border" : NUM.test(v) ? `border-${v}` : `border-[${v}]`) : null,
  },
  borderColor: { panel: "border", toClass: colorClass("border") },
  borderRadius: { panel: "border", toClass: tokenClass("rounded", "radius") },
  lineHeight: { panel: "typography", toClass: tokenClass("leading", "leading") },
  letterSpacing: { panel: "typography", toClass: tokenClass("tracking", "tracking") },
  // decoration + letterCase are exclusive keyword choices; the class is looked
  // up (no theme, no arbitrary form).
  decoration: { panel: "typography", toClass: (v) => (v ? (KEYWORD_CLASS[v] ?? null) : null) },
  letterCase: { panel: "typography", toClass: (v) => (v ? (KEYWORD_CLASS[v] ?? null) : null) },
};

// prop → the `supports` predicate that opts a block into it. One line per prop.
const PROP_SUPPORT: Record<string, (s: StyleSupports) => boolean | undefined> = {
  fontSize: (s) => s.typography?.fontSize,
  lineHeight: (s) => s.typography?.lineHeight,
  letterSpacing: (s) => s.typography?.letterSpacing,
  decoration: (s) => s.typography?.decoration,
  letterCase: (s) => s.typography?.letterCase,
  textColor: (s) => s.color?.text,
  backgroundColor: (s) => s.color?.background,
  padding: (s) => s.spacing?.padding,
  margin: (s) => s.spacing?.margin,
  borderWidth: (s) => s.border?.width,
  borderColor: (s) => s.border?.color,
  borderRadius: (s) => s.border?.radius,
};

/** A named style VARIATION (C6): a block-declared class-set the user can pick
 * (Gutenberg's "Styles" — Default/Display/Subtitle/…). Unlike the universal
 * props, variations are per block TYPE, so they resolve against the definition. */
export interface StyleVariation {
  readonly name: string;
  readonly label: string;
  readonly class: string;
}

/** Resolve the active variation's classes from a block's declared variations. */
export function variationClasses(
  variations: readonly StyleVariation[] | undefined,
  key: string | undefined,
): string[] {
  if (!variations || !key) return [];
  return (variations.find((v) => v.name === key)?.class ?? "").split(/\s+/).filter(Boolean);
}

/** The universal serializer: a block's style values → Tailwind classes on its
 * root, resolved against the theme (defaults to the page-active theme). */
export function styleClasses(
  style: StyleValues | undefined,
  theme: Theme = activeTheme(),
): string[] {
  if (!style) return [];
  const out: string[] = [];
  for (const [prop, value] of Object.entries(style)) {
    const cls = STYLE_PROPS[prop]?.toClass(value, theme);
    if (cls) out.push(cls);
  }
  return out;
}

/** Whether a block that declares `supports` opts into a given style prop (editor renders the control). */
export function blockSupportsStyle(supports: StyleSupports | undefined, prop: string): boolean {
  return !!supports && !!PROP_SUPPORT[prop]?.(supports);
}

// ---------------------------------------------------------------------------
// LENSES over a class list (E2, css-engine thoughts). The class attribute is
// the style CARRIER: a lens READS its prop's value out of the classes and
// WRITES by replacing its own classes — no parallel store, no island. The
// reverse mapping lives here so it derives from the same STYLE_PROPS +
// theme-token knowledge as the forward one (they cannot drift).
//
// v0 scope rule (from the POC): classes carrying a variant (`sm:`, `hover:` —
// anything with ":") or a modifier ("/", e.g. `bg-white/5`) are never touched
// — they stay authored until the variant axis lands.

// The arbitrary-value form: `text-[17px]` → "17px" (underscores decode to spaces).
const arb = (prefix: string, cls: string): string | null =>
  cls.startsWith(`${prefix}-[`) && cls.endsWith("]")
    ? cls.slice(prefix.length + 2, -1).replaceAll("_", " ")
    : null;

// A value that reads as a CSS color — disambiguates shared prefixes
// (`text-[#f00]` is a color, `text-[17px]` a size; `border-[…]` likewise).
const COLORISH = /^(#|rgb|hsl|oklch|oklab|color\(|var\()/;

// token-scale reverse: `text-lg` → "lg" iff the theme has text-lg.
const fromToken =
  (utility: string, ns: string, colorish?: boolean) =>
  (cls: string, theme: Theme): string | null => {
    if (cls.startsWith(`${utility}-`)) {
      const suffix = cls.slice(utility.length + 1);
      if (!suffix.startsWith("[") && hasToken(theme, `${ns}-${suffix}`)) return suffix;
    }
    const raw = arb(utility, cls);
    if (raw !== null && (colorish === undefined || COLORISH.test(raw) === colorish)) return raw;
    return null;
  };

// color reverse for a prefix: token (`text-red-500` → "red-500") or colorish arbitrary.
const fromColor =
  (prefix: string) =>
  (cls: string, theme: Theme): string | null => {
    if (cls.startsWith(`${prefix}-`)) {
      const suffix = cls.slice(prefix.length + 1);
      if (!suffix.startsWith("[") && hasToken(theme, `color-${suffix}`)) return suffix;
    }
    const raw = arb(prefix, cls);
    return raw !== null && COLORISH.test(raw) ? raw : null;
  };

// numeric-step reverse: `p-4` → "4"; `p-[3px]` → "3px".
const fromStep =
  (prefix: string) =>
  (cls: string): string | null => {
    const m = new RegExp(`^${prefix}-(\\d+(?:\\.\\d+)?)$`).exec(cls);
    if (m) return m[1];
    return arb(prefix, cls);
  };

const fromKeyword =
  (scale: readonly { key: string; class: string }[]) =>
  (cls: string): string | null =>
    scale.find((k) => k.class === cls)?.key ?? null;

// prop → reverse mapping (class → value, resolved forms only; an unknown
// token suffix is NOT claimed — it surfaces via unresolvedUtilities instead).
const FROM_CLASS: Record<string, (cls: string, theme: Theme) => string | null> = {
  fontSize: fromToken("text", "text", false),
  textColor: fromColor("text"),
  backgroundColor: fromColor("bg"),
  padding: fromStep("p"),
  margin: fromStep("m"),
  borderWidth: (cls) => {
    if (cls === "border") return "1";
    const m = /^border-(\d+(?:\.\d+)?)$/.exec(cls);
    if (m) return m[1];
    const raw = arb("border", cls);
    return raw !== null && !COLORISH.test(raw) ? raw : null;
  },
  borderColor: fromColor("border"),
  borderRadius: fromToken("rounded", "radius"),
  lineHeight: fromToken("leading", "leading"),
  letterSpacing: fromToken("tracking", "tracking"),
  decoration: fromKeyword(DECORATIONS),
  letterCase: fromKeyword(LETTER_CASES),
};

// The v0 scope rule + never touch arbitrary-PROPERTY classes ([color:red]).
const lensable = (cls: string): boolean =>
  !cls.includes(":") && !cls.includes("/") && !cls.startsWith("[");

/** Read a prop's value out of a class list (last owner wins, like CSS). */
export function readStyleClass(
  prop: string,
  classes: readonly string[],
  theme: Theme = activeTheme(),
): string | undefined {
  const from = FROM_CLASS[prop];
  if (!from) return undefined;
  let value: string | undefined;
  for (const cls of classes) {
    if (!lensable(cls)) continue;
    const v = from(cls, theme);
    if (v !== null) value = v;
  }
  return value;
}

/** Write a prop's value into a class list: remove every class the prop owns,
 * append the new value's class ("" just clears). Returns a new list. */
export function patchStyleClasses(
  prop: string,
  value: string,
  classes: readonly string[],
  theme: Theme = activeTheme(),
): string[] {
  const from = FROM_CLASS[prop];
  const kept = classes.filter((cls) => !from || !lensable(cls) || from(cls, theme) === null);
  const next = value ? STYLE_PROPS[prop]?.toClass(value, theme) : null;
  if (next) kept.push(next);
  return kept;
}

/** A utility-shaped class whose token is missing from the theme (`text-xxxxl`):
 * claimed at the PANEL level, not by a lens — `namespaces` are the candidate
 * token namespaces the Define… flow offers (shared prefixes are ambiguous). */
export interface UnresolvedUtility {
  cls: string;
  suffix: string;
  namespaces: string[];
}

// Prefixes worth flagging + their candidate namespaces. Static utilities that
// share a prefix but are not token-driven (text-center, bg-cover…) are
// skipped conservatively — the ENGINE's diagnostics (E3) are authoritative;
// this local detector only feeds the pre-engine Define… loop.
const UTILITY_SHAPES: { prefix: string; namespaces: string[]; skip?: RegExp }[] = [
  {
    prefix: "text",
    namespaces: ["text", "color"],
    skip: /^(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  },
  {
    prefix: "bg",
    namespaces: ["color"],
    skip: /^(cover|contain|center|fixed|local|scroll|repeat|no-repeat|none|top|bottom|left|right|auto|clip-.*|origin-.*|gradient-.*|linear-.*|radial-.*|conic-.*)$/,
  },
  {
    prefix: "border",
    namespaces: ["color"],
    skip: /^(\d+(\.\d+)?)$|^(solid|dashed|dotted|double|hidden|none|collapse|separate|spacing.*)$|^[trblxyse](-|$)/,
  },
  { prefix: "rounded", namespaces: ["radius"], skip: /^(none|full|[trblxyse]{1,2}(-|$).*)$/ },
  { prefix: "leading", namespaces: ["leading"], skip: /^(none|\d+(\.\d+)?)$/ },
  { prefix: "tracking", namespaces: ["tracking"] },
];

/** Scan a class list for utility-shaped classes whose token the theme lacks. */
export function unresolvedUtilities(
  classes: readonly string[],
  theme: Theme = activeTheme(),
): UnresolvedUtility[] {
  const out: UnresolvedUtility[] = [];
  for (const cls of classes) {
    if (!lensable(cls)) continue;
    for (const { prefix, namespaces, skip } of UTILITY_SHAPES) {
      if (!cls.startsWith(`${prefix}-`)) continue;
      const suffix = cls.slice(prefix.length + 1);
      if (!suffix || suffix.startsWith("[")) break; // arbitrary form — always resolvable
      if (skip?.test(suffix)) break;
      const resolved = namespaces.some((ns) => hasToken(theme, `${ns}-${suffix}`));
      if (!resolved) out.push({ cls, suffix, namespaces });
      break;
    }
  }
  return out;
}
