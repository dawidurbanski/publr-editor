// Code block — pre with plain-text content.

import { escHtml } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

export const type = "code";

export const definition: BlockDefinition = {
  label: "Code",
  category: "Text",
  icon: "code",
  placeholder: "Write code…",
  supports: TEXT_SUPPORTS,
  toolbar: [],
  render(fields: Fields) {
    return `<pre data-pb-block="code" data-pb-text="code">${escHtml(fields.code ?? "")}</pre>`;
  },
};
