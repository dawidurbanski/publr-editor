// Custom HTML block — a deliberate authoring surface for arbitrary markup
// Relationship to the RESERVED raw-html passthrough
// (CONTRACT.md): raw-html is what permissive upcast mints for markup it
// doesn't recognize — never insertable, opaque in the canvas. This block
// is chosen on purpose from the inserter and its content stays live and
// editable (a rich carrier div). A source-code editing view needs a
// pipeline-specific render, which the single-path renderer contract bans —
// deferred with it.

import { str } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

export const type = "html";

export const definition: BlockDefinition = {
  label: "Custom HTML",
  category: "Widgets",
  icon: "html",
  placeholder: "Write HTML…",
  description: "Add custom HTML markup.",
  allowedFormats: [],
  toolbar: [],
  render(fields: Fields) {
    return `<div data-pb-block="html" data-pb-rich="content">${str(fields.content)}</div>`;
  },
};
