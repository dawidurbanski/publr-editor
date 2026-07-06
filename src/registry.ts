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

import { CARRIERS, CHILDREN_ATTR, RAW_TYPE, readCarrier, scopedCarriers } from "./carriers";
import type { CarrierKind } from "./carriers";

/** What a render receives: the block's fields, any of which may be absent. */
export type Fields = Record<string, string | undefined>;

/** What registerBlock accepts: label + render, plus optional editor-UI metadata. */
export interface BlockDefinition {
  label: string;
  render: (fields: Fields) => string;
  placeholder?: string;
  /** Inserter shelf the block files under (e.g. "Text", "Media", "Design"). */
  category?: string;
}

/** A field derived from the probe: carrier attribute → kind, value → name, read-back → default. */
export interface FieldSpec {
  readonly name: string;
  readonly type: CarrierKind;
  readonly default: string;
}

/** A validated, frozen registry entry. */
export interface BlockType {
  readonly label: string;
  readonly render: (fields: Fields) => string;
  readonly placeholder?: string;
  readonly category?: string;
  readonly fields: readonly FieldSpec[];
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
    if (!["label", "render", "placeholder", "category"].includes(key))
      fail(ctx, `unknown key "${key}"`);
  }
  if (typeof def.label !== "string" || !def.label) fail(ctx, "label is required");
  if (typeof def.render !== "function") fail(ctx, "render(fields) function is required");
  if ("placeholder" in def && typeof def.placeholder !== "string")
    fail(ctx, "placeholder must be a string");
  if ("category" in def && (typeof def.category !== "string" || !def.category))
    fail(ctx, "category must be a non-empty string");

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

  const fields: FieldSpec[] = []; // in carrier DOM order — the editor's notion of "first field"
  for (const carrier of scopedCarriers(root)) {
    for (const { attr, kind } of CARRIERS) {
      const name = carrier.getAttribute(attr);
      if (!name) continue;
      if (fields.some((f) => f.name === name))
        fail(ctx, `field "${name}" is carried twice in the render output`);
      fields.push(Object.freeze({ name, type: kind, default: readCarrier(carrier, kind) }));
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
    if (CARRIERS.some(({ attr }) => slot.hasAttribute(attr)))
      fail(ctx, `the ${CHILDREN_ATTR} slot cannot also be a field carrier`);
    if (slot.children.length)
      fail(ctx, `the ${CHILDREN_ATTR} slot must be empty in the probe render`);
  }

  const frozen: BlockType = Object.freeze({
    label: def.label,
    render: def.render,
    ...(def.placeholder != null ? { placeholder: def.placeholder } : {}),
    ...(def.category != null ? { category: def.category } : {}),
    fields: Object.freeze(fields),
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
