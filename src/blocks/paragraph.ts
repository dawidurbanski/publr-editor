// Paragraph block — one rich body (Gutenberg core/paragraph).

import type { BlockDefinition, Fields } from "../registry";

export const type = "paragraph";

export const definition: BlockDefinition = {
  label: "Paragraph",
  category: "Text",
  icon: "paragraph",
  render(fields: Fields) {
    return `<p data-pb-block="paragraph" data-pb-rich="body">${fields.body ?? ""}</p>`;
  },
};
