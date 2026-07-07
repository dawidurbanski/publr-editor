// Pullquote block — figure with an emphasized quote value + citation
// (Gutenberg core/pullquote). Unlike quote, the body is one rich value.
// The root is the figure, so the rich carrier needs its own element — a
// root-level rich read would swallow the cite.

import { escHtml } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

export const type = "pullquote";

export const definition: BlockDefinition = {
  label: "Pullquote",
  category: "Text",
  icon: "pullquote",
  placeholder: "Add quote…",
  description: "Give special visual emphasis to a quote from your text.",
  render(fields: Fields) {
    return `<figure data-pb-block="pullquote" class="border-y py-6 text-center"><blockquote class="text-2xl"><div data-pb-rich="value">${fields.value ?? ""}</div></blockquote><cite data-pb-text="citation" class="mt-2 block text-sm not-italic">${escHtml(fields.citation ?? "")}</cite></figure>`;
  },
};
