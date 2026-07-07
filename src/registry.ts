// registry.ts — the GLOBAL block registry. registerBlock(type, def) is THE
// public registration surface: Publr core, plugins, and the devtools console
// all use the same call. Definitions are validated hard and frozen; the
// registry itself stays live (register/unregister at any time).
//
// The render is the schema: a definition is { label, render } plus optional
// editor-UI metadata that CANNOT be derived from markup (currently:
// `placeholder` — the ghost prompt shown while the block is empty). Fields
// are DERIVED by probing render({}) — the data-pb-* carriers in the output
// are the field declarations, the values read back are the defaults. No
// parallel field list to drift.

import {
  CARRIERS,
  CHILDREN_ATTR,
  RAW_TYPE,
  SETTINGS_SELECTOR,
  readCarrier,
  scopedCarriers,
} from "./carriers";
import type { CarrierKind, FieldValue } from "./carriers";

/** What a render receives: the block's fields, any of which may be absent. */
export type Fields = Record<string, FieldValue | undefined>;

/**
 * The second render input: island-carried setting values, declared defaults
 * filled in. Absent on blocks that declare no island settings (and in the
 * registration probe) — renders must tolerate that, same conformance rule as
 * absent fields.
 */
export type Settings = Record<string, unknown>;

/** One choice a setting control offers. */
export interface SettingOption {
  /** What picking it writes: the field value — or the block TYPE on a transform setting. */
  readonly value: string;
  readonly label: string;
  /**
   * Icon NAME the chrome resolves against its icon set (demo: src/icons.ts,
   * the @wordpress/icons-derived sprite). Chrome without the name falls back
   * to the label — icons are presentation vocabulary, never validated here.
   */
  readonly icon?: string;
}

/** The control kinds the chrome vocabulary knows. */
export type SettingControl = "toggle-group" | "toggle" | "select" | "text" | "number";

/**
 * A declared sidebar control — editor-UI metadata a render can't carry
 * (a carrier declares that a field exists, not which values it may take).
 * Exactly one binding per setting:
 * - `field`: the control writes that field (editor.setField) — e.g. a
 *   heading's `level` tag carrier offering h1…h6. toggle-group only.
 * - `transform: true`: the options are block TYPES and picking one switches
 *   the whole block (editor.transformBlock) — e.g. group ⇄ row/stack/grid.
 *   toggle-group only.
 * - `setting`: an ISLAND-bound value name (editor.setSetting) — the value
 *   lives in the block's data-pb-settings island, not in any DOM carrier.
 *   Legal on every control kind; REQUIRES a `default` typed per kind.
 *
 * Per-kind shape (validated hard at registration):
 * - "toggle-group": options required; island binding needs a string default
 *   that is one of the option values.
 * - "toggle": boolean default; no options.
 * - "select": options required; string default that is one of the options.
 * - "text": string default; optional `placeholder`.
 * - "number": finite number default; optional finite `min`/`max`/`step`
 *   (step > 0, min ≤ max, default within [min, max]).
 */
export interface SettingSpec {
  /** Control kind the chrome renders. The vocabulary grows as controls land. */
  readonly control: SettingControl;
  /** Accessible name for the control (chrome may render it invisibly). */
  readonly label: string;
  readonly field?: string;
  readonly transform?: boolean;
  readonly setting?: string;
  /** The island value when the document carries none — required with `setting`. */
  readonly default?: unknown;
  readonly options?: readonly SettingOption[];
  readonly placeholder?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

const CONTROLS: readonly SettingControl[] = ["toggle-group", "toggle", "select", "text", "number"];

// Keys each control kind may carry beyond { control, label } — anything else
// is rejected, including the field/transform bindings outside toggle-group.
const SPEC_KEYS: Record<SettingControl, readonly string[]> = {
  "toggle-group": ["field", "transform", "setting", "default", "options"],
  toggle: ["setting", "default"],
  select: ["setting", "default", "options"],
  text: ["setting", "default", "placeholder"],
  number: ["setting", "default", "min", "max", "step"],
};

/** One island-bound setting derived from the specs: name + declared default. */
export interface IslandSetting {
  readonly name: string;
  readonly default: unknown;
}

/** What registerBlock accepts: label + render, plus optional editor-UI metadata. */
export interface BlockDefinition {
  label: string;
  render: (fields: Fields, settings?: Settings) => string;
  placeholder?: string;
  /** Inserter shelf the block files under (e.g. "Text", "Media", "Design"). */
  category?: string;
  /** One-liner shown on the sidebar's block card (what the block is for). */
  description?: string;
  /** Icon name for chrome surfaces (card, tree, inserters) — see SettingOption.icon. */
  icon?: string;
  /** Sidebar controls, in display order. */
  settings?: SettingSpec[];
  /**
   * Block types the children slot accepts (requires a slot). Gates what the
   * EDITOR puts there — insert/transform/split are refused; upcast stays
   * permissive (foreign content always loads). Absent = everything.
   */
  allowedChildren?: string[];
  /**
   * Block types seeded into the slot on fresh insert (Gutenberg innerBlocks
   * template — e.g. a list starts with one list-item). Requires a slot;
   * absent = the editor's defaultBlock seeding.
   */
  childTemplate?: string[];
  /**
   * Hidden from inserter chrome — the type exists only inside its parent,
   * created by templates and Enter-splitting (e.g. list-item).
   */
  internal?: boolean;
  /**
   * Field names that keep NATIVE Enter (no block split) — for carriers where
   * a newline is content or a split makes no sense (table sections, math).
   * Fields carried on/inside <pre> opt out automatically (FieldSpec
   * `preformatted`); this covers the rest.
   */
  noSplit?: string[];
}

/** A field derived from the probe: carrier attribute → kind, value → name, read-back → default. */
export interface FieldSpec {
  readonly name: string;
  readonly type: CarrierKind;
  readonly default: FieldValue;
  /**
   * The carrier sits on/inside a <pre> — whitespace is content: the value
   * skips load normalization and Enter stays native. Derived from the probe
   * (HTML semantics), never declared. Present only when true.
   */
  readonly preformatted?: true;
}

/** A validated, frozen registry entry. */
export interface BlockType {
  readonly label: string;
  readonly render: (fields: Fields, settings?: Settings) => string;
  readonly placeholder?: string;
  readonly category?: string;
  readonly description?: string;
  readonly icon?: string;
  readonly settings?: readonly SettingSpec[];
  readonly allowedChildren?: readonly string[];
  readonly childTemplate?: readonly string[];
  readonly internal?: boolean;
  readonly noSplit?: readonly string[];
  readonly fields: readonly FieldSpec[];
  /**
   * The island-bound settings, derived from the specs — what cast/editor use
   * to fill defaults and decide island presence without re-walking settings.
   * Empty on blocks that declare none.
   */
  readonly islandSettings: readonly IslandSetting[];
  /** Derived from the probe: the render emits a data-pb-children slot. */
  readonly acceptsChildren: boolean;
}

const NAME = /^[a-z][a-z0-9-]*$/;

const registry = new Map<string, BlockType>();

function fail(ctx: string, msg: string): never {
  throw new Error(`PublrEditor: ${ctx}: ${msg}`);
}

export function registerBlock(type: string, def: BlockDefinition): BlockType {
  const ctx = `registerBlock("${type}")`;
  if (!NAME.test(type ?? "")) fail(ctx, "type must be a lowercase name");
  if (type === RAW_TYPE) fail(ctx, `"${RAW_TYPE}" is the reserved passthrough type`);
  if (registry.has(type)) fail(ctx, "already registered");
  if (def === null || typeof def !== "object") fail(ctx, "definition must be an object");
  for (const key of Object.keys(def)) {
    if (
      ![
        "label",
        "render",
        "placeholder",
        "category",
        "description",
        "icon",
        "settings",
        "allowedChildren",
        "childTemplate",
        "internal",
        "noSplit",
      ].includes(key)
    )
      fail(ctx, `unknown key "${key}"`);
  }
  if (typeof def.label !== "string" || !def.label) fail(ctx, "label is required");
  if (typeof def.render !== "function") fail(ctx, "render(fields) function is required");
  if ("placeholder" in def && typeof def.placeholder !== "string")
    fail(ctx, "placeholder must be a string");
  if ("category" in def && (typeof def.category !== "string" || !def.category))
    fail(ctx, "category must be a non-empty string");
  if ("description" in def && (typeof def.description !== "string" || !def.description))
    fail(ctx, "description must be a non-empty string");
  if ("icon" in def && (typeof def.icon !== "string" || !def.icon))
    fail(ctx, "icon must be a non-empty string");
  if ("internal" in def && typeof def.internal !== "boolean")
    fail(ctx, "internal must be a boolean");
  const typeList = (key: "allowedChildren" | "childTemplate" | "noSplit") => {
    if (!(key in def)) return undefined;
    const list = def[key];
    if (!Array.isArray(list) || !list.length || list.some((v) => typeof v !== "string" || !v))
      fail(ctx, `${key} must be a non-empty array of names`);
    return Object.freeze([...list]) as readonly string[];
  };
  const allowedChildren = typeList("allowedChildren");
  const childTemplate = typeList("childTemplate");
  const noSplit = typeList("noSplit");
  if (allowedChildren && childTemplate) {
    for (const t of childTemplate) {
      if (!allowedChildren.includes(t))
        fail(ctx, `childTemplate type "${t}" is not in allowedChildren`);
    }
  }

  // The render output IS the schema. Probe it with empty fields: the
  // data-pb-* carriers it emits are the field declarations (attribute →
  // kind, value → name), and the values read back from them are the
  // defaults — so a declared default can never drift from the render's
  // fallback and break the round-trip law. Conformance rule this relies on:
  // render(fields) must tolerate absent fields.
  const tmp = document.createElement("div");
  try {
    tmp.innerHTML = def.render({});
  } catch (err) {
    fail(ctx, `render({}) threw — render must tolerate absent fields (${String(err)})`);
  }
  const root = tmp.firstElementChild;
  if (!root || tmp.children.length !== 1) fail(ctx, "render must produce exactly one root element");
  if (root.getAttribute("data-pb-block") !== type)
    fail(ctx, `render root must carry data-pb-block="${type}"`);
  // Islands are CAST vocabulary — downcast emits them from block.settings; a
  // render emitting its own would double-carry (and be read as this block's
  // island on upcast, shadowing the real values).
  if (root.querySelector(SETTINGS_SELECTOR))
    fail(ctx, "render must not emit a data-pb-settings island — downcast owns the island");

  const fields: FieldSpec[] = []; // in carrier DOM order — the editor's notion of "first field"
  for (const carrier of scopedCarriers(root)) {
    for (const { attr, kind } of CARRIERS) {
      const name = carrier.getAttribute(attr);
      if (!name) continue;
      if (fields.some((f) => f.name === name))
        fail(ctx, `field "${name}" is carried twice in the render output`);
      // On/inside <pre>, whitespace is content (HTML semantics) — derived
      // here so cast and Enter handling never re-probe.
      const preformatted = (kind === "text" || kind === "rich") && !!carrier.closest("pre");
      const dflt = readCarrier(carrier, kind);
      fields.push(
        Object.freeze({
          name,
          type: kind,
          default: typeof dflt === "object" ? Object.freeze(dflt) : dflt,
          ...(preformatted ? { preformatted: true as const } : {}),
        }),
      );
    }
  }
  if (noSplit) {
    for (const name of noSplit) {
      if (!fields.some((f) => f.name === name))
        fail(ctx, `noSplit field "${name}" is not carried by the render`);
    }
  }

  // The children slot is declared the same way fields are — in the render.
  // Scoped like carriers (root itself may be the slot); one per block, empty
  // in the probe (children are appended by downcast, never rendered), and
  // never doubling as a field carrier (a rich read would swallow the children).
  const slots = [...root.querySelectorAll(`[${CHILDREN_ATTR}]`)];
  if (root.matches(`[${CHILDREN_ATTR}]`)) slots.unshift(root);
  const scopedSlots = slots.filter((el) => el.closest("[data-pb-block]") === root);
  if (scopedSlots.length > 1) fail(ctx, `at most one ${CHILDREN_ATTR} slot per render`);
  const slot = scopedSlots[0];
  if (slot) {
    // A tag carrier is fine on the slot (it reads the tagName, e.g. a list's
    // ul/ol root); a text/rich read would swallow the children.
    if (slot.hasAttribute("data-pb-text") || slot.hasAttribute("data-pb-rich"))
      fail(ctx, `the ${CHILDREN_ATTR} slot cannot also be a field carrier`);
    if (slot.children.length)
      fail(ctx, `the ${CHILDREN_ATTR} slot must be empty in the probe render`);
  }
  if ((allowedChildren || childTemplate) && !slot)
    fail(ctx, "allowedChildren/childTemplate require a children slot in the render");

  // Settings are validated AFTER the probe: a field-bound setting must name
  // a field the render actually carries — a control writing a field no
  // carrier reads back would silently violate the round-trip law. (Island
  // values have no carrier BY DESIGN — the island is theirs.)
  let settings: readonly SettingSpec[] | undefined;
  if ("settings" in def) {
    if (!Array.isArray(def.settings)) fail(ctx, "settings must be an array");
    const islandNames = new Set<string>();
    settings = Object.freeze(
      def.settings.map((s, i) => {
        const sctx = `settings[${i}]`;
        if (s === null || typeof s !== "object") fail(ctx, `${sctx} must be an object`);
        const control = s.control as SettingControl;
        if (!CONTROLS.includes(control)) fail(ctx, `${sctx}: unknown control "${String(control)}"`);
        for (const key of Object.keys(s)) {
          if (key !== "control" && key !== "label" && !SPEC_KEYS[control].includes(key))
            fail(ctx, `${sctx}: unknown key "${key}" on a "${control}" control`);
        }
        if (typeof s.label !== "string" || !s.label) fail(ctx, `${sctx}: label is required`);

        // Exactly one binding. field/transform are toggle-group-only (their
        // keys are rejected above elsewhere), so the other kinds reduce to
        // "setting is required".
        const bindsField = s.field != null;
        const bindsTransform = s.transform != null;
        const bindsIsland = s.setting != null;
        if (Number(bindsField) + Number(bindsTransform) + Number(bindsIsland) !== 1)
          fail(ctx, `${sctx}: exactly one of "field", "transform" or "setting" is required`);
        if (bindsField && !fields.some((f) => f.name === s.field))
          fail(ctx, `${sctx}: field "${String(s.field)}" is not carried by the render`);
        if (bindsTransform && s.transform !== true) fail(ctx, `${sctx}: transform must be true`);
        if (bindsIsland) {
          if (typeof s.setting !== "string" || !s.setting)
            fail(ctx, `${sctx}: setting must be a non-empty string`);
          if (islandNames.has(s.setting)) fail(ctx, `${sctx}: duplicate setting "${s.setting}"`);
          islandNames.add(s.setting);
          if (!("default" in s)) fail(ctx, `${sctx}: island-bound settings require a default`);
        }

        // Options: the choice-based kinds require them; the rest reject the
        // key above.
        let options: readonly SettingOption[] | undefined;
        if (control === "toggle-group" || control === "select") {
          if (!Array.isArray(s.options) || !s.options.length)
            fail(ctx, `${sctx}: options must be a non-empty array`);
          const seen = new Set<string>();
          options = Object.freeze(
            s.options.map((o) => {
              if (o === null || typeof o !== "object" || typeof o.value !== "string" || !o.value)
                fail(ctx, `${sctx}: every option needs a non-empty string value`);
              if (typeof o.label !== "string" || !o.label)
                fail(ctx, `${sctx}: every option needs a non-empty string label`);
              if ("icon" in o && (typeof o.icon !== "string" || !o.icon))
                fail(ctx, `${sctx}: option icon must be a non-empty string`);
              if (seen.has(o.value)) fail(ctx, `${sctx}: duplicate option value "${o.value}"`);
              seen.add(o.value);
              return Object.freeze({
                value: o.value,
                label: o.label,
                ...(o.icon != null ? { icon: o.icon } : {}),
              });
            }),
          );
        }

        // Per-kind default typing (island bindings only — field/transform
        // derive their current value from the block, never from a default).
        if (bindsIsland) {
          const d = s.default;
          if (control === "toggle" && typeof d !== "boolean")
            fail(ctx, `${sctx}: a "toggle" default must be a boolean`);
          if (control === "text" && typeof d !== "string")
            fail(ctx, `${sctx}: a "text" default must be a string`);
          if (control === "toggle-group" || control === "select") {
            if (typeof d !== "string" || !options!.some((o) => o.value === d))
              fail(ctx, `${sctx}: the default must be one of the option values`);
          }
          if (control === "number") {
            if (typeof d !== "number" || !Number.isFinite(d))
              fail(ctx, `${sctx}: a "number" default must be a finite number`);
            for (const key of ["min", "max", "step"] as const) {
              if (key in s && (typeof s[key] !== "number" || !Number.isFinite(s[key])))
                fail(ctx, `${sctx}: ${key} must be a finite number`);
            }
            if (s.step != null && s.step <= 0) fail(ctx, `${sctx}: step must be > 0`);
            if (s.min != null && s.max != null && s.min > s.max)
              fail(ctx, `${sctx}: min must be ≤ max`);
            if ((s.min != null && d < s.min) || (s.max != null && d > s.max))
              fail(ctx, `${sctx}: the default must sit within [min, max]`);
          }
        }
        if (control === "text" && "placeholder" in s && typeof s.placeholder !== "string")
          fail(ctx, `${sctx}: placeholder must be a string`);

        return Object.freeze({
          control,
          label: s.label,
          ...(bindsField ? { field: s.field } : {}),
          ...(bindsTransform ? { transform: true as const } : {}),
          ...(bindsIsland ? { setting: s.setting, default: s.default } : {}),
          ...(options ? { options } : {}),
          ...(control === "text" && s.placeholder != null ? { placeholder: s.placeholder } : {}),
          ...(control === "number" && s.min != null ? { min: s.min } : {}),
          ...(control === "number" && s.max != null ? { max: s.max } : {}),
          ...(control === "number" && s.step != null ? { step: s.step } : {}),
        });
      }),
    );
  }

  // The island-bound subset, name → default: what cast/editor consult to fill
  // defaults and decide island presence.
  const islandSettings: readonly IslandSetting[] = Object.freeze(
    (settings ?? [])
      .filter((s) => s.setting != null)
      .map((s) => Object.freeze({ name: s.setting!, default: s.default })),
  );

  const frozen: BlockType = Object.freeze({
    label: def.label,
    render: def.render,
    ...(def.placeholder != null ? { placeholder: def.placeholder } : {}),
    ...(def.category != null ? { category: def.category } : {}),
    ...(def.description != null ? { description: def.description } : {}),
    ...(def.icon != null ? { icon: def.icon } : {}),
    ...(settings ? { settings } : {}),
    ...(allowedChildren ? { allowedChildren } : {}),
    ...(childTemplate ? { childTemplate } : {}),
    ...(def.internal ? { internal: true } : {}),
    ...(noSplit ? { noSplit } : {}),
    fields: Object.freeze(fields),
    islandSettings,
    acceptsChildren: !!slot,
  });
  registry.set(type, frozen);
  return frozen;
}

export function unregisterBlock(type: string): boolean {
  return registry.delete(type);
}

export const getBlockType = (type: string): BlockType | undefined => registry.get(type);

/** All registered block types in registration order: [{ type, label, fields, render }, …]. Inserter/slash-menu fodder. */
export function blockTypes(): ({ type: string } & BlockType)[] {
  return Array.from(registry, ([type, def]) => ({ type, ...def }));
}
