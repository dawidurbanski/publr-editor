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

export interface StyleCapability {
  /** Shown without using the panel's optional-controls menu. Defaults to true. */
  default?: boolean;
  /** Optional curated value vocabulary; absent means the active theme/control default. */
  values?: readonly string[];
  /** Whether the UI accepts an arbitrary CSS value. Defaults to true. */
  allowCustom?: boolean;
}

export type StyleSupport = boolean | StyleCapability;

/** Which style panels a block opts into (registerBlock `supports`). */
export interface StyleSupports {
  typography?: {
    fontSize?: StyleSupport;
    lineHeight?: StyleSupport;
    letterSpacing?: StyleSupport;
    decoration?: StyleSupport;
    letterCase?: StyleSupport;
    textAlign?: StyleSupport;
    fontWeight?: StyleSupport;
    fontStyle?: StyleSupport;
  };
  color?: { text?: StyleSupport; background?: StyleSupport };
  spacing?: {
    padding?: StyleSupport;
    paddingTop?: StyleSupport;
    paddingRight?: StyleSupport;
    paddingBottom?: StyleSupport;
    paddingLeft?: StyleSupport;
    margin?: StyleSupport;
    marginTop?: StyleSupport;
    marginRight?: StyleSupport;
    marginBottom?: StyleSupport;
    marginLeft?: StyleSupport;
  };
  dimensions?: {
    width?: StyleSupport;
    height?: StyleSupport;
    minHeight?: StyleSupport;
    minWidth?: StyleSupport;
    flexBasis?: StyleSupport;
    aspectRatio?: StyleSupport;
  };
  layout?: {
    gap?: StyleSupport;
    rowGap?: StyleSupport;
    columnGap?: StyleSupport;
    justifyContent?: StyleSupport;
    alignItems?: StyleSupport;
    flexWrap?: StyleSupport;
    gridColumns?: StyleSupport;
  };
  border?: {
    width?: StyleSupport;
    color?: StyleSupport;
    radius?: StyleSupport;
    style?: StyleSupport;
  };
}

export const styleSupportEnabled = (support: StyleSupport | undefined): boolean =>
  support === true || (!!support && typeof support === "object");

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
export const TEXT_ALIGNMENTS = [
  { key: "left", label: "Left", class: "text-left" },
  { key: "center", label: "Center", class: "text-center" },
  { key: "right", label: "Right", class: "text-right" },
  { key: "justify", label: "Justify", class: "text-justify" },
] as const;
export const FONT_WEIGHTS = [
  { key: "normal", label: "Regular", class: "font-normal" },
  { key: "medium", label: "Medium", class: "font-medium" },
  { key: "semibold", label: "Semibold", class: "font-semibold" },
  { key: "bold", label: "Bold", class: "font-bold" },
] as const;
export const FONT_STYLES = [
  { key: "normal", label: "Regular", class: "not-italic" },
  { key: "italic", label: "Italic", class: "italic" },
] as const;
export const JUSTIFY_CONTENT = [
  { key: "start", label: "Start", class: "justify-start" },
  { key: "center", label: "Center", class: "justify-center" },
  { key: "end", label: "End", class: "justify-end" },
  { key: "between", label: "Between", class: "justify-between" },
  { key: "around", label: "Around", class: "justify-around" },
  { key: "evenly", label: "Evenly", class: "justify-evenly" },
] as const;
export const ALIGN_ITEMS = [
  { key: "start", label: "Start", class: "items-start" },
  { key: "center", label: "Center", class: "items-center" },
  { key: "end", label: "End", class: "items-end" },
  { key: "stretch", label: "Stretch", class: "items-stretch" },
  { key: "baseline", label: "Baseline", class: "items-baseline" },
] as const;
export const BORDER_STYLES = [
  { key: "solid", label: "Solid", class: "border-solid" },
  { key: "dashed", label: "Dashed", class: "border-dashed" },
  { key: "dotted", label: "Dotted", class: "border-dotted" },
  { key: "double", label: "Double", class: "border-double" },
  { key: "none", label: "None", class: "border-none" },
] as const;
export const FLEX_WRAPS = [
  { key: "nowrap", label: "No wrap", class: "flex-nowrap" },
  { key: "wrap", label: "Wrap", class: "flex-wrap" },
  { key: "reverse", label: "Reverse", class: "flex-wrap-reverse" },
] as const;

const KEYWORD_CLASS: Record<string, string> = Object.fromEntries(
  [...DECORATIONS, ...LETTER_CASES].map((k) => [k.key, k.class]),
);

// Numeric steps (v4 spacing multiplier / border widths) — "4", "1.5".
const NUM = /^\d+(\.\d+)?$/;
const arbitrary = (value: string): string => value.trim().replace(/\s+/g, "_");

// value → class for a color-consuming prefix: theme token (`red-500` →
// text-red-500) or raw CSS color (`#ff0000` → text-[#ff0000]).
const colorClass =
  (prefix: string) =>
  (v: string, theme: Theme): string | null =>
    v ? (hasToken(theme, `color-${v}`) ? `${prefix}-${v}` : `${prefix}-[${arbitrary(v)}]`) : null;

// value → class for a token namespace: `lg` → text-lg if the theme has
// text-lg, else arbitrary (`17px` → text-[17px]). utility and namespace
// differ where Tailwind's class prefix ≠ the token prefix (rounded/radius).
const tokenClass =
  (utility: string, ns: string) =>
  (v: string, theme: Theme): string | null =>
    v ? (hasToken(theme, `${ns}-${v}`) ? `${utility}-${v}` : `${utility}-[${arbitrary(v)}]`) : null;

// value → class for the numeric spacing scale: any number is a step
// (`p-4`, `m-1.5`); anything else is a raw length (`p-[3px]`).
const stepClass =
  (prefix: string) =>
  (v: string): string | null =>
    v ? (NUM.test(v) ? `${prefix}-${v}` : `${prefix}-[${arbitrary(v)}]`) : null;

const fixedClass = (scale: readonly { key: string; class: string }[]) => (v: string) =>
  v ? (scale.find((option) => option.key === v)?.class ?? null) : null;

const dimensionClass = (prefix: string) => (v: string) =>
  v ? (NUM.test(v) ? `${prefix}-${v}` : `${prefix}-[${arbitrary(v)}]`) : null;
const gridColumnsClass = (v: string) =>
  v ? (/^(?:[1-9]|1[0-2])$/.test(v) ? `grid-cols-${v}` : `grid-cols-[${arbitrary(v)}]`) : null;

const ASPECTS = [
  { key: "auto", class: "aspect-auto" },
  { key: "square", class: "aspect-square" },
  { key: "video", class: "aspect-video" },
] as const;

// The style vocabulary. Each prop maps a value → class against the theme.
export const STYLE_PROPS: Record<string, StyleProp> = {
  fontSize: { panel: "typography", toClass: tokenClass("text", "text") },
  textAlign: { panel: "typography", toClass: fixedClass(TEXT_ALIGNMENTS) },
  fontWeight: { panel: "typography", toClass: fixedClass(FONT_WEIGHTS) },
  fontStyle: { panel: "typography", toClass: fixedClass(FONT_STYLES) },
  textColor: { panel: "color", toClass: colorClass("text") },
  backgroundColor: { panel: "color", toClass: colorClass("bg") },
  padding: { panel: "spacing", toClass: stepClass("p") },
  paddingTop: { panel: "spacing", toClass: stepClass("pt") },
  paddingRight: { panel: "spacing", toClass: stepClass("pr") },
  paddingBottom: { panel: "spacing", toClass: stepClass("pb") },
  paddingLeft: { panel: "spacing", toClass: stepClass("pl") },
  margin: { panel: "spacing", toClass: stepClass("m") },
  marginTop: { panel: "spacing", toClass: stepClass("mt") },
  marginRight: { panel: "spacing", toClass: stepClass("mr") },
  marginBottom: { panel: "spacing", toClass: stepClass("mb") },
  marginLeft: { panel: "spacing", toClass: stepClass("ml") },
  width: { panel: "dimensions", toClass: dimensionClass("w") },
  height: { panel: "dimensions", toClass: dimensionClass("h") },
  minHeight: { panel: "dimensions", toClass: dimensionClass("min-h") },
  minWidth: { panel: "dimensions", toClass: dimensionClass("min-w") },
  flexBasis: { panel: "dimensions", toClass: dimensionClass("basis") },
  aspectRatio: {
    panel: "dimensions",
    toClass: (v) => fixedClass(ASPECTS)(v) ?? (v ? `aspect-[${arbitrary(v)}]` : null),
  },
  gap: { panel: "layout", toClass: stepClass("gap") },
  rowGap: { panel: "layout", toClass: stepClass("gap-y") },
  columnGap: { panel: "layout", toClass: stepClass("gap-x") },
  justifyContent: { panel: "layout", toClass: fixedClass(JUSTIFY_CONTENT) },
  alignItems: { panel: "layout", toClass: fixedClass(ALIGN_ITEMS) },
  flexWrap: { panel: "layout", toClass: fixedClass(FLEX_WRAPS) },
  gridColumns: { panel: "layout", toClass: gridColumnsClass },
  borderWidth: {
    panel: "border",
    // v4 border widths are fixed utilities: "1" ⇒ `border`, other numbers ⇒
    // `border-N`, raw lengths ⇒ arbitrary.
    toClass: (v) =>
      v ? (v === "1" ? "border" : NUM.test(v) ? `border-${v}` : `border-[${arbitrary(v)}]`) : null,
  },
  borderColor: { panel: "border", toClass: colorClass("border") },
  borderRadius: { panel: "border", toClass: tokenClass("rounded", "radius") },
  borderStyle: { panel: "border", toClass: fixedClass(BORDER_STYLES) },
  lineHeight: { panel: "typography", toClass: tokenClass("leading", "leading") },
  letterSpacing: { panel: "typography", toClass: tokenClass("tracking", "tracking") },
  // decoration + letterCase are exclusive keyword choices; the class is looked
  // up (no theme, no arbitrary form).
  decoration: { panel: "typography", toClass: (v) => (v ? (KEYWORD_CLASS[v] ?? null) : null) },
  letterCase: { panel: "typography", toClass: (v) => (v ? (KEYWORD_CLASS[v] ?? null) : null) },
};

// prop → the `supports` predicate that opts a block into it. One line per prop.
const PROP_SUPPORT: Record<string, (s: StyleSupports) => StyleSupport | undefined> = {
  fontSize: (s) => s.typography?.fontSize,
  textAlign: (s) => s.typography?.textAlign,
  fontWeight: (s) => s.typography?.fontWeight,
  fontStyle: (s) => s.typography?.fontStyle,
  lineHeight: (s) => s.typography?.lineHeight,
  letterSpacing: (s) => s.typography?.letterSpacing,
  decoration: (s) => s.typography?.decoration,
  letterCase: (s) => s.typography?.letterCase,
  textColor: (s) => s.color?.text,
  backgroundColor: (s) => s.color?.background,
  padding: (s) => s.spacing?.padding,
  paddingTop: (s) => s.spacing?.paddingTop,
  paddingRight: (s) => s.spacing?.paddingRight,
  paddingBottom: (s) => s.spacing?.paddingBottom,
  paddingLeft: (s) => s.spacing?.paddingLeft,
  margin: (s) => s.spacing?.margin,
  marginTop: (s) => s.spacing?.marginTop,
  marginRight: (s) => s.spacing?.marginRight,
  marginBottom: (s) => s.spacing?.marginBottom,
  marginLeft: (s) => s.spacing?.marginLeft,
  width: (s) => s.dimensions?.width,
  height: (s) => s.dimensions?.height,
  minHeight: (s) => s.dimensions?.minHeight,
  minWidth: (s) => s.dimensions?.minWidth,
  flexBasis: (s) => s.dimensions?.flexBasis,
  aspectRatio: (s) => s.dimensions?.aspectRatio,
  gap: (s) => s.layout?.gap,
  rowGap: (s) => s.layout?.rowGap,
  columnGap: (s) => s.layout?.columnGap,
  justifyContent: (s) => s.layout?.justifyContent,
  alignItems: (s) => s.layout?.alignItems,
  flexWrap: (s) => s.layout?.flexWrap,
  gridColumns: (s) => s.layout?.gridColumns,
  borderWidth: (s) => s.border?.width,
  borderColor: (s) => s.border?.color,
  borderRadius: (s) => s.border?.radius,
  borderStyle: (s) => s.border?.style,
};

/** A named style VARIATION (C6): a block-declared class-set the user can pick
 * ("Styles" — Default/Display/Subtitle/…). Unlike the universal
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
  return !!supports && styleSupportEnabled(PROP_SUPPORT[prop]?.(supports));
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
  textAlign: fromKeyword(TEXT_ALIGNMENTS),
  fontWeight: fromKeyword(FONT_WEIGHTS),
  fontStyle: fromKeyword(FONT_STYLES),
  textColor: fromColor("text"),
  backgroundColor: fromColor("bg"),
  padding: fromStep("p"),
  paddingTop: fromStep("pt"),
  paddingRight: fromStep("pr"),
  paddingBottom: fromStep("pb"),
  paddingLeft: fromStep("pl"),
  margin: fromStep("m"),
  marginTop: fromStep("mt"),
  marginRight: fromStep("mr"),
  marginBottom: fromStep("mb"),
  marginLeft: fromStep("ml"),
  width: fromStep("w"),
  height: fromStep("h"),
  minHeight: fromStep("min-h"),
  minWidth: fromStep("min-w"),
  flexBasis: fromStep("basis"),
  aspectRatio: (cls) => {
    const fixed = fromKeyword(ASPECTS)(cls);
    return fixed ?? arb("aspect", cls);
  },
  gap: fromStep("gap"),
  rowGap: fromStep("gap-y"),
  columnGap: fromStep("gap-x"),
  justifyContent: fromKeyword(JUSTIFY_CONTENT),
  alignItems: fromKeyword(ALIGN_ITEMS),
  flexWrap: fromKeyword(FLEX_WRAPS),
  gridColumns: (cls) => {
    const match = /^grid-cols-(\d+)$/.exec(cls);
    return match ? match[1] : arb("grid-cols", cls);
  },
  borderWidth: (cls) => {
    if (cls === "border") return "1";
    const m = /^border-(\d+(?:\.\d+)?)$/.exec(cls);
    if (m) return m[1];
    const raw = arb("border", cls);
    return raw !== null && !COLORISH.test(raw) ? raw : null;
  },
  borderColor: fromColor("border"),
  borderRadius: fromToken("rounded", "radius"),
  borderStyle: fromKeyword(BORDER_STYLES),
  lineHeight: fromToken("leading", "leading"),
  letterSpacing: fromToken("tracking", "tracking"),
  decoration: fromKeyword(DECORATIONS),
  letterCase: fromKeyword(LETTER_CASES),
};

// The v0 scope rule + never touch arbitrary-PROPERTY classes ([color:red]).
const lensable = (cls: string): boolean => {
  const structure = cls.replace(/\[[^\]]*\]/g, "[]");
  return !structure.includes(":") && !structure.includes("/") && !cls.startsWith("[");
};

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
