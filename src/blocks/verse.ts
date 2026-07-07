// Verse block — poetry: a pre root preserving line breaks and indentation,
// but keeping the page's font (Gutenberg core/verse). Same derived
// preformatted semantics as the preformatted block.

import type { BlockDefinition, Fields } from "../registry";

export const type = "verse";

export const definition: BlockDefinition = {
  label: "Verse",
  category: "Text",
  icon: "verse",
  placeholder: "Write poetry…",
  description: "Insert poetry. Use special spacing formats. Or quote song lyrics.",
  render(fields: Fields) {
    return `<pre data-pb-block="verse" data-pb-rich="content" class="whitespace-pre-wrap [font-family:inherit] [font-size:inherit]">${fields.content ?? ""}</pre>`;
  },
};
