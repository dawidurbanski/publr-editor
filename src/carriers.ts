// carriers.ts — wire-contract primitives shared by every layer: the carrier
// vocabulary (data-pb-* attribute ↔ field kind), carrier scoping/reading,
// HTML escaping for renders, id minting, class-list splitting.

export const RAW_TYPE = "raw-html";

/** The three carrier kinds the wire contract knows. */
export type CarrierKind = "text" | "rich" | "tag";

/**
 * One block instance in the model. Plain JSON by construction (round-trip
 * law). `classes` — authored classes beyond the render's baseline — is
 * absent on raw-html passthrough blocks. `children` — inner blocks — is
 * present exactly when the block's TYPE accepts children (its render emits a
 * data-pb-children slot), empty array included; never on other blocks.
 * `settings` — island-carried values with no DOM carrier — follows the same
 * presence convention keyed on the type's declared island settings: present
 * exactly when the type declares at least one, `{}` when every value sits at
 * its declared default (the model stays SPARSE — defaults are the registry's
 * to fill at the render seam), never on other blocks. Values are plain JSON.
 */
export interface Block {
  type: string;
  id: string;
  fields: Record<string, string>;
  classes?: string;
  children?: Block[];
  settings?: Record<string, unknown>;
}

export interface Model {
  blocks: Block[];
}

export const CARRIERS: readonly { attr: string; kind: CarrierKind }[] = [
  { attr: "data-pb-text", kind: "text" },
  { attr: "data-pb-rich", kind: "rich" },
  { attr: "data-pb-tag", kind: "tag" },
];

export const CARRIER_SELECTOR = CARRIERS.map((c) => `[${c.attr}]`).join(",");
export const EDITABLE_SELECTOR = "[data-pb-text],[data-pb-rich]";

/** Marks the ONE element in a render where inner blocks live. */
export const CHILDREN_ATTR = "data-pb-children";

/**
 * The settings island: the canonical carrier for model facts with no visible
 * DOM carrier (CONTRACT.md "Settings island"). Downcast emits it as the FIRST
 * child of the block root; upcast tolerates it anywhere scoped to the root.
 */
export const SETTINGS_SELECTOR = 'script[type="application/json"][data-pb-settings]';

/**
 * Make a JSON string safe as inline <script> text: `</` becomes `<\/` so a
 * hostile `</script>` payload can't break out of the island. `\/` is a valid
 * JSON escape for `/`, so the payload parses back byte-identical.
 */
export function escJsonScript(json: string): string {
  return json.replace(/<\//g, "<\\/");
}

export function escHtml(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escAttr(s: unknown): string {
  return escHtml(s).replace(/"/g, "&quot;");
}

export function mintId(): string {
  return (
    "b_" + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)
  );
}

// Carriers belong to the nearest block root (foreign HTML may nest roots).
export function scopedCarriers(root: Element): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>(CARRIER_SELECTOR)];
  if (root.matches(CARRIER_SELECTOR)) all.unshift(root as HTMLElement);
  return all.filter((el) => el.closest("[data-pb-block]") === root);
}

// The children slot follows the same scoping rule (a nested container's slot
// belongs to that container, not the outer one); the root itself may be the
// slot — the common shape for a bare group.
export function scopedChildrenSlot(root: Element): HTMLElement | null {
  const all = [...root.querySelectorAll<HTMLElement>(`[${CHILDREN_ATTR}]`)];
  if (root.matches(`[${CHILDREN_ATTR}]`)) all.unshift(root as HTMLElement);
  return all.find((el) => el.closest("[data-pb-block]") === root) ?? null;
}

// The block's own settings island follows the same rule; the island itself is
// never a block root, so the root match variant doesn't apply.
export function scopedSettingsIsland(root: Element): HTMLElement | null {
  return (
    [...root.querySelectorAll<HTMLElement>(SETTINGS_SELECTOR)].find(
      (el) => el.closest("[data-pb-block]") === root,
    ) ?? null
  );
}

export function readCarrier(el: Element, kind: CarrierKind): string {
  if (kind === "tag") return el.tagName.toLowerCase();
  // A settings island can sit INSIDE a carrier (the block root may itself be
  // the carrier — e.g. a <pre data-pb-text> code block): the island is cast
  // metadata, never field content, so guard the read. Only the islands scoped
  // to THIS block are stripped — one nested inside a foreign block root within
  // a rich value belongs to that root and stays content here.
  let source = el;
  if (el.querySelector(SETTINGS_SELECTOR)) {
    const clone = el.cloneNode(true) as Element;
    for (const island of clone.querySelectorAll(SETTINGS_SELECTOR)) {
      const owner = island.closest("[data-pb-block]");
      if (!owner || owner === clone) island.remove();
    }
    source = clone;
  }
  return kind === "text" ? (source.textContent ?? "") : source.innerHTML;
}

export const classList = (s: string | null | undefined): string[] =>
  (s ?? "").split(/\s+/).filter(Boolean);
