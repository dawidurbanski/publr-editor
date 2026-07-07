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
  allowedFormats: null,
};

/** Resolve the root policy from a createEditor policy config (absent → unset). */
export function resolveRootPolicy(config: PolicyConfig): RootPolicy {
  return {
    allowedBlocks: config.allowedBlocks ?? null,
    orderable: config.orderable ?? null,
    preset: config.preset ?? null,
  };
}

/**
 * Effective policy for a block of `type`, from the createEditor config's
 * per-type override merged over the permissive default. This is the A1 slice of
 * the eventual merge — registry type rules and per-instance context (patterns)
 * layer in later, most-restrictive.
 */
export function resolveBlockPolicy(config: PolicyConfig, type: string): BlockPolicy {
  const override = config.blocks?.[type];
  return override ? { ...DEFAULT_BLOCK_POLICY, ...override } : DEFAULT_BLOCK_POLICY;
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
