// Preformatted block — pre with rich content, whitespace preserved
// (Gutenberg core/preformatted). Unlike code, the content is rich (inline
// markup survives). The carrier sits on <pre>, so load normalization and
// Enter-splitting switch off by derivation (FieldSpec.preformatted) — a
// newline here is content.

import type { BlockDefinition, Fields } from "../registry";

export const type = "preformatted";

export const definition: BlockDefinition = {
  label: "Preformatted",
  category: "Text",
  icon: "preformatted",
  placeholder: "Preformatted text…",
  description: "Add text that respects your spacing and tabs, and also allows styling.",
  render(fields: Fields) {
    return `<pre data-pb-block="preformatted" data-pb-rich="content" class="whitespace-pre-wrap">${fields.content ?? ""}</pre>`;
  },
};
