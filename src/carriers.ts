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
 */
export interface Block {
  type: string;
  id: string;
  fields: Record<string, string>;
  classes?: string;
  children?: Block[];
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

export function readCarrier(el: Element, kind: CarrierKind): string {
  if (kind === "text") return el.textContent ?? "";
  if (kind === "rich") return el.innerHTML;
  return el.tagName.toLowerCase(); // tag
}

export const classList = (s: string | null | undefined): string[] =>
  (s ?? "").split(/\s+/).filter(Boolean);
