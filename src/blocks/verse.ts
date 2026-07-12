// Verse block — poetry: a pre root preserving line breaks and indentation,
// but keeping the page's font. Same derived
// preformatted semantics as the preformatted block.

import { str } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

export const type = "verse";

export const definition: BlockDefinition = {
  label: "Verse",
  category: "Text",
  icon: "verse",
  placeholder: "Write poetry…",
  description: "Insert poetry. Use special spacing formats. Or quote song lyrics.",
  supports: TEXT_SUPPORTS,
  toolbar: [{ control: "text-align", label: "Align text" }],
  render(fields: Fields) {
    return `<pre data-pb-block="verse" data-pb-rich="content" class="whitespace-pre-wrap [font-family:inherit] [font-size:inherit]">${str(fields.content)}</pre>`;
  },
};
