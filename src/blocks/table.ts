// Table block — table root; head/body/foot sections are rich carriers
// holding the row markup directly, the caption is its own rich carrier
// (Gutenberg core/table, minus its cell-matrix attributes: the carriers
// hold the section HTML, which is what the wire format wants anyway).
// The sections are noSplit — Enter belongs to the cells; fixedLayout is
// island-canonical, the table-fixed class is derived presentation.

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const DEFAULT_BODY = "<tr><td></td><td></td></tr><tr><td></td><td></td></tr>";

export const type = "table";

export const definition: BlockDefinition = {
  label: "Table",
  category: "Text",
  icon: "table",
  placeholder: "Add caption",
  description: "Create structured content in rows and columns to display information.",
  noSplit: ["head", "body", "foot"],
  settings: [
    { control: "toggle", label: "Fixed width table cells", setting: "fixedLayout", default: true },
  ],
  render(fields: Fields, settings?: Settings) {
    const fixed = settings?.fixedLayout === false ? "" : " table-fixed";
    return `<table data-pb-block="table" class="w-full border-collapse${fixed} [&_:is(td,th)]:border [&_:is(td,th)]:p-2"><caption data-pb-rich="caption" class="caption-bottom text-sm">${str(fields.caption)}</caption><thead data-pb-rich="head" class="font-semibold">${str(fields.head)}</thead><tbody data-pb-rich="body">${fields.body === undefined ? DEFAULT_BODY : str(fields.body)}</tbody><tfoot data-pb-rich="foot">${str(fields.foot)}</tfoot></table>`;
  },
};
