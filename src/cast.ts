// cast.ts — HTML ⇄ model. Upcast is permissive by design (foreign, partial,
// or AI-written HTML always loads; unknown markup becomes raw-html
// passthrough blocks). Downcast dispatches to each block's render — the
// renderer is the downcast body. Conformance test for both directions:
// upcast(downcast(model)) must deep-equal the model (the round-trip law).

import {
  CARRIERS,
  RAW_TYPE,
  classList,
  mintId,
  readCarrier,
  scopedCarriers,
  scopedChildrenSlot,
} from "./carriers";
import type { Block, CarrierKind, Model } from "./carriers";
import { getBlockType } from "./registry";
import type { BlockType } from "./registry";

// The classes the block's own render emits for these fields; everything else
// in the class attribute is authored content and must survive round trips.
function baselineClasses(def: BlockType, fields: Block["fields"]): string[] {
  const tmp = document.createElement("div");
  try {
    tmp.innerHTML = def.render(fields);
  } catch {
    return [];
  }
  return classList(tmp.firstElementChild?.getAttribute("class"));
}

// Loading normalizes carried values (contract: downcast∘upcast is
// SEMANTICALLY stable, not byte-stable): whitespace runs collapse to one
// space and edges are trimmed — source-file indentation is formatting, not
// content, and carrying it verbatim makes serialized output ragged. Load
// path ONLY: the input-event path must never fight whitespace the user is
// mid-typing. Rich values collapse per TEXT NODE so attribute values stay
// untouched. A future preformatted kind (code/pre blocks) opts out here.
function normalizeValue(value: string, kind: CarrierKind): string {
  if (kind !== "rich") return value.replace(/\s+/g, " ").trim();
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  for (let node: Text | null; (node = walker.nextNode() as Text | null); ) {
    node.data = node.data.replace(/\s+/g, " ");
  }
  return tmp.innerHTML.trim();
}

function upcastElement(el: Element): Block {
  const type = el.getAttribute("data-pb-block");
  const def = type ? getBlockType(type) : null;

  if (!type || !def) {
    const clone = el.cloneNode(true) as Element;
    clone.removeAttribute("data-pb-id"); // id is model bookkeeping, re-stamped on downcast
    return {
      type: RAW_TYPE,
      id: el.getAttribute("data-pb-id") || mintId(),
      fields: { html: clone.outerHTML },
    };
  }

  const block: Block = { type, id: el.getAttribute("data-pb-id") || mintId(), fields: {} };
  for (const carrier of scopedCarriers(el)) {
    for (const { attr, kind } of CARRIERS) {
      const field = carrier.getAttribute(attr);
      if (field) block.fields[field] = normalizeValue(readCarrier(carrier, kind), kind);
    }
  }
  for (const f of def.fields) {
    if (!(f.name in block.fields)) block.fields[f.name] = f.default;
  }

  // Inner blocks recurse through the same permissive upcast — unknown markup
  // inside a slot degrades to raw-html children, never breaks the container.
  if (def.acceptsChildren) {
    const slot = scopedChildrenSlot(el);
    block.children = slot ? [...slot.children].map(upcastElement) : [];
  }

  const baseline = new Set(baselineClasses(def, block.fields));
  block.classes = classList(el.getAttribute("class"))
    .filter((c) => !baseline.has(c))
    .join(" ");
  return block;
}

/** Annotated HTML → model. Never throws on content. */
export function upcast(rootEl: Element): Model {
  return { blocks: [...rootEl.children].map(upcastElement) };
}

/** Render one block to a detached element: render output + stamped identity. */
export function blockToElement(block: Block): HTMLElement | null {
  const tmp = document.createElement("div");

  if (block.type === RAW_TYPE) {
    tmp.innerHTML = block.fields?.html ?? "";
    const root = tmp.firstElementChild as HTMLElement | null;
    if (root) root.setAttribute("data-pb-id", block.id);
    return root;
  }

  const def = getBlockType(block.type);
  if (!def) {
    console.warn(`PublrEditor: no registered block for "${block.type}" — dropped`);
    return null;
  }
  tmp.innerHTML = def.render(block.fields ?? {});
  const root = tmp.firstElementChild as HTMLElement | null;
  if (!root) return null;
  if (root.getAttribute("data-pb-block") !== block.type) {
    console.warn(
      `PublrEditor: render for "${block.type}" did not emit data-pb-block="${block.type}"`,
    );
  }
  root.setAttribute("data-pb-id", block.id);
  if (block.classes) {
    const merged = [...classList(root.getAttribute("class"))];
    for (const c of classList(block.classes)) if (!merged.includes(c)) merged.push(c);
    root.setAttribute("class", merged.join(" "));
  }
  if (block.children) {
    const slot = scopedChildrenSlot(root);
    if (slot) {
      for (const child of block.children) {
        const childEl = blockToElement(child);
        if (childEl) slot.appendChild(childEl);
      }
    } else if (block.children.length) {
      console.warn(
        `PublrEditor: render for "${block.type}" emitted no data-pb-children slot — ${block.children.length} inner block(s) dropped`,
      );
    }
  }
  return root;
}

/**
 * Downcast targets. "editor" is the full wire contract (data-pb-* carriers,
 * identity, islands) — admin↔admin copy-paste fidelity. "data" is the
 * published shape: the same output with the editing vocabulary stripped;
 * data-p-* (PublrJS runtime) always survives. Data-pipeline output re-upcasts
 * as raw-html blocks — content preserved, typing gone — by permissive upcast.
 */
export type DowncastPipeline = "editor" | "data";

// The data pipeline is a post-pass over editor-pipeline output, never a
// renderer mode: the renderer stays single-path, so stripping sits inside the
// no-preview-drift guarantee. The walk covers raw-html passthroughs too —
// unknown-type blocks keep foreign data-pb-* (and settings islands) inside
// fields.html, and published output must be clean all the way down.
function stripEditingVocabulary(root: Element): void {
  // Islands first: stripping attributes would remove the data-pb-settings
  // marker this selector needs.
  for (const island of root.querySelectorAll('script[type="application/json"][data-pb-settings]')) {
    island.remove();
  }
  for (const el of [root, ...root.querySelectorAll("*")]) {
    // getAttributeNames() is a static list — safe to remove while iterating
    for (const name of el.getAttributeNames()) {
      if (name.startsWith("data-pb-")) el.removeAttribute(name);
    }
  }
}

/** Model → HTML (block elements joined by newlines) via the given pipeline. */
export function downcast(model: Model, pipeline: DowncastPipeline = "editor"): string {
  return model.blocks
    .map((b) => {
      const root = blockToElement(b);
      if (root && pipeline === "data") stripEditingVocabulary(root);
      return root?.outerHTML;
    })
    .filter(Boolean)
    .join("\n");
}
