// policy.ts — the editing-policy layer: a RUNTIME schema beside the content
// model, NOT part of the wire contract. Policy is a constraint, not an editable
// value, so it never rides `data-pb-*` and never serializes (thoughts/010, the
// CKEditor Model+Schema split). PARSE-FREE and enforcement-free at this stage
// (Phase A / story A1): here we only resolve the config into a queryable shape;
// A2–A5 read it to gate editing.
//
// Three sources feed the layer (none is content HTML): registerBlock (type
// rules), createEditor({ policy }) (instance/global — this file), and pattern/
// template definitions (per-instance context — Phase B). A1 wires only the
// createEditor source; the others merge in as they land, most-restrictive.

/** Resolved root/container policy — what may happen to the editor's direct children. */
export interface RootPolicy {
  /**
   * Insertable block types. `null` = unrestricted (unset); `false` = insertion
   * off (no inserter); a list = the allowlist. Per-container, never inherited
   * (thoughts/006).
   */
  allowedBlocks: readonly string[] | false | null;
  /** May direct children be reordered? `null` = unset. */
  orderable: boolean | null;
  /** Raw preset name (e.g. "content-only"), UNEXPANDED — A5 expands it. */
  preset: string | null;
}

/** Resolved per-block policy — what may be done to one block. Defaults are all-permissive. */
export interface BlockPolicy {
  editable: boolean;
  movable: boolean;
  removable: boolean;
  duplicable: boolean;
  /** May the block's STYLE be changed (Phase C)? A distinct dimension from
   * `editable`: content-only edits text but locks style. */
  stylable: boolean;
  /**
   * Allowed inline formats inside this block's editable carriers. `null` = all;
   * `[]` = plain text; a list = the subset.
   */
  allowedFormats: readonly string[] | null;
}

/**
 * What a host hands `createEditor({ policy })`. Instance/global scope — the
 * PublrInlineEditor field passes its lock config here; `loadHtml` brings the
 * content, never the policy. Per-type overrides key on block TYPE.
 */
export interface PolicyConfig {
  allowedBlocks?: readonly string[] | false;
  orderable?: boolean;
  preset?: string;
  /** Per-type policy overrides at this editor's scope, keyed by block type. */
  blocks?: Record<string, Partial<BlockPolicy>>;
  /**
   * Per-container-type SLOT policy (D2): what a container's DIRECT children may
   * do, keyed by the container's block type. Scoped, never cascaded from root
   * (thoughts/006); intersects the block-def allowedChildren, most-restrictive.
   */
  slots?: Record<string, { allowedBlocks?: readonly string[] | false; orderable?: boolean }>;
}

/** Resolved slot policy for one container type — what its direct children may do (D2). */
export interface SlotPolicy {
  allowedBlocks: readonly string[] | false | null;
  orderable: boolean | null;
}

/** The editor's resolved policy view (query result of `editor.policy`). */
export interface EditorPolicy {
  root: RootPolicy;
}

/** A block that no source constrains — every capability open. */
export const DEFAULT_BLOCK_POLICY: BlockPolicy = {
  editable: true,
  movable: true,
  removable: true,
  duplicable: true,
  stylable: true,
  allowedFormats: null,
};

// Named presets are SUGAR (thoughts/004/005): each names a canonical policy the
// resolvers expand into, so there's ONE representation and no second source of
// truth. A preset supplies the BASE; explicit config then overrides it (a
// content-only editor can still, say, un-pin one type). `fixed` aliases
// `content-only` — the familiar content-only lock: edit content, but no
// insert / reorder / remove.
const PRESET_ROOT: Record<string, Partial<RootPolicy>> = {
  "content-only": { allowedBlocks: false, orderable: false },
};
const PRESET_BLOCK: Record<string, Partial<BlockPolicy>> = {
  "content-only": {
    editable: true,
    movable: false,
    removable: false,
    duplicable: false,
    stylable: false,
  },
};

/** Canonical preset name for a raw `preset` string, or null if unknown. */
function presetName(preset: string | undefined): string | null {
  const p = preset?.toLowerCase().replace(/[\s_]/g, "-");
  return p === "fixed" || p === "content-only" || p === "contentonly" ? "content-only" : null;
}

/** Whether a raw preset name resolves to the canonical content-only mode. */
export const isContentOnlyPreset = (preset: string | undefined): boolean =>
  presetName(preset) === "content-only";

/** Resolve the root policy from a createEditor policy config (preset-expanded; absent → unset). */
export function resolveRootPolicy(config: PolicyConfig): RootPolicy {
  const base = PRESET_ROOT[presetName(config.preset) ?? ""] ?? {};
  return {
    allowedBlocks: config.allowedBlocks ?? base.allowedBlocks ?? null,
    orderable: config.orderable ?? base.orderable ?? null,
    preset: config.preset ?? null,
  };
}

/**
 * Effective policy for a block of `type`: the permissive default, then the
 * preset's canonical block policy, then the per-type override on top. (Registry
 * type rules and per-instance pattern context layer in later, most-restrictive.)
 */
export function resolveBlockPolicy(config: PolicyConfig, type: string): BlockPolicy {
  const presetBlock = PRESET_BLOCK[presetName(config.preset) ?? ""] ?? {};
  return { ...DEFAULT_BLOCK_POLICY, ...presetBlock, ...config.blocks?.[type] };
}

/**
 * Resolve a container type's SLOT policy — the rules for its DIRECT children
 * (D2). Absent → unconstrained; each container is independent of root
 * (thoughts/006). The preset does NOT reach inside slots (content-only locks
 * the root level; nested containers keep their own policy).
 */
export function resolveSlotPolicy(config: PolicyConfig, containerType: string): SlotPolicy {
  const s = config.slots?.[containerType];
  return {
    allowedBlocks: s?.allowedBlocks ?? null,
    orderable: s?.orderable ?? null,
  };
}

/**
 * Intersect two allowed-format sets, most-restrictive (thoughts/004: sources
 * combine, never loosen). `null` = unconstrained (all marks); `[]` = none
 * (plain text). null ∩ x = x; [] ∩ x = []; [a,b] ∩ [b,c] = [b].
 */
export function intersectFormats(
  a: readonly string[] | null,
  b: readonly string[] | null,
): readonly string[] | null {
  if (a === null) return b;
  if (b === null) return a;
  return a.filter((m) => b.includes(m));
}

/** One-line policy summary for the debug trace. */
export function summarizeRootPolicy(r: RootPolicy): string {
  const allowed =
    r.allowedBlocks === null
      ? "all"
      : r.allowedBlocks === false
        ? "none"
        : r.allowedBlocks.join("/");
  return `allowed=${allowed} orderable=${r.orderable ?? "unset"}${r.preset ? ` preset=${r.preset}` : ""}`;
}
