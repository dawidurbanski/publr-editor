// Code block — pre with plain-text content (Gutenberg core/code).

import { escHtml } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

export const type = "code";

export const definition: BlockDefinition = {
  label: "Code",
  category: "Text",
  icon: "code",
  placeholder: "Write code…",
  render(fields: Fields) {
    return `<pre data-pb-block="code" data-pb-text="code">${escHtml(fields.code ?? "")}</pre>`;
  },
};
