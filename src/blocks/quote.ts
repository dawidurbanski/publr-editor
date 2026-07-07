// Quote block — rich body + citation (Gutenberg core/quote, minus its
// innerBlocks body — nested quote content is a later wave). The body sits
// in its own element: a root-level rich read would swallow the cite.

import { escHtml } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

export const type = "quote";

export const definition: BlockDefinition = {
  label: "Quote",
  category: "Text",
  icon: "quote",
  placeholder: "Quote",
  description: "Give quoted text visual emphasis.",
  render(fields: Fields) {
    return `<blockquote data-pb-block="quote" class="border-l-2 pl-4"><div data-pb-rich="body">${fields.body ?? ""}</div><cite data-pb-text="citation" class="mt-1 block text-sm not-italic">${escHtml(fields.citation ?? "")}</cite></blockquote>`;
  },
};
