// Math block — math root whose rich carrier holds MathML markup, the same
// convention a future icon block uses for SVG (we carry the MathML
// directly — LaTeX authoring needs a converter and is deferred). noSplit: Enter inside a formula is
// never a block split.

import { str } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

const DEFAULT_MATH = "<mrow><msup><mi>x</mi><mn>2</mn></msup></mrow>";

export const type = "math";

export const definition: BlockDefinition = {
  label: "Math",
  category: "Text",
  icon: "math",
  description: "Display mathematical notation (MathML).",
  noSplit: ["math"],
  allowedFormats: [],
  toolbar: [],
  render(fields: Fields) {
    return `<math data-pb-block="math" data-pb-rich="math" display="block" class="block py-2 text-center">${fields.math === undefined ? DEFAULT_MATH : str(fields.math)}</math>`;
  },
};
