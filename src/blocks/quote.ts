// Quote block — one rich body on a blockquote (Gutenberg core/quote).

import type { BlockDefinition, Fields } from "../registry";

export const type = "quote";

export const definition: BlockDefinition = {
  label: "Quote",
  category: "Text",
  icon: "quote",
  placeholder: "Quote",
  render(fields: Fields) {
    return `<blockquote data-pb-block="quote" data-pb-rich="body">${fields.body ?? ""}</blockquote>`;
  },
};
