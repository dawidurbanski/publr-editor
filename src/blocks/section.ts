// Section block — semantic container whose root IS the slot: children sit
// directly inside the classed element, so template structure survives 1:1.
// The tag rides the wire as markup (tag carrier), switched from the
// sidebar. Covers GB group's tagName option too — the group family keeps
// its layout-variant transform instead (documented scope decision).

import type { BlockDefinition, Fields } from "../registry";

const TAGS = ["div", "section", "main", "header", "footer", "aside", "article"];

export const type = "section";

export const definition: BlockDefinition = {
  label: "Section",
  category: "Design",
  icon: "section",
  description: "A semantic container for grouping content — div, section, header, footer…",
  settings: [
    {
      control: "toggle-group",
      label: "HTML element",
      field: "tag",
      options: TAGS.map((t) => ({ value: t, label: t })),
    },
  ],
  render(fields: Fields) {
    const tag = typeof fields.tag === "string" && TAGS.includes(fields.tag) ? fields.tag : "div";
    return `<${tag} data-pb-block="section" data-pb-tag="tag" data-pb-children></${tag}>`;
  },
};
