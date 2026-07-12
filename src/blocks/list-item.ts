// List item block — one li with rich content.
// Internal: created by the list's childTemplate and same-type Enter-
// splitting, never the inserter. Nested sub-lists are a later wave.

import { str } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

export const type = "list-item";

export const definition: BlockDefinition = {
  label: "List item",
  category: "Text",
  icon: "list-item",
  internal: true,
  supports: TEXT_SUPPORTS,
  placeholder: "List item…",
  render(fields: Fields) {
    return `<li data-pb-block="list-item" data-pb-rich="content">${str(fields.content)}</li>`;
  },
};
