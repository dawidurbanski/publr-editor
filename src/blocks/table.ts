// Table block — table root; head/body/foot sections are rich carriers
// holding the row markup directly, the caption is its own rich carrier
// (no cell-matrix attributes are modeled: the carriers
// hold the section HTML, which is what the wire format wants anyway).
// The sections are noSplit — Enter belongs to the cells; fixedLayout is
// island-canonical, the table-fixed class is derived presentation.

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

const DEFAULT_BODY = "<tr><td></td><td></td></tr><tr><td></td><td></td></tr>";

export const type = "table";

export const definition: BlockDefinition = {
  label: "Table",
  category: "Text",
  icon: "table",
  placeholder: "Add caption",
  description: "Create structured content in rows and columns to display information.",
  supports: TEXT_SUPPORTS,
  noSplit: ["head", "body", "foot"],
  toolbar: [
    { control: "caption", label: "Caption", field: "caption", setting: "showCaption" },
    {
      control: "toggle-setting",
      label: "Header section",
      setting: "showHeader",
      role: "structure",
    },
    {
      control: "toggle-setting",
      label: "Footer section",
      setting: "showFooter",
      role: "structure",
    },
    {
      control: "toggle-setting",
      label: "Fixed width cells",
      setting: "fixedLayout",
      role: "design",
    },
    {
      control: "setting-options",
      label: "Align cells",
      setting: "cellAlignment",
      role: "design",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
  ],
  settings: [
    {
      control: "toggle",
      label: "Caption",
      setting: "showCaption",
      default: false,
      role: "content",
    },
    {
      control: "toggle",
      label: "Header section",
      setting: "showHeader",
      default: false,
      role: "structure",
    },
    {
      control: "toggle",
      label: "Footer section",
      setting: "showFooter",
      default: false,
      role: "structure",
    },
    {
      control: "toggle",
      label: "Fixed width table cells",
      setting: "fixedLayout",
      default: true,
      role: "design",
    },
    {
      control: "toggle-group",
      label: "Cell text alignment",
      setting: "cellAlignment",
      default: "left",
      role: "design",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const fixed = settings?.fixedLayout === false ? "" : " table-fixed";
    const align =
      settings?.cellAlignment === "center"
        ? " [&_:is(td,th)]:text-center"
        : settings?.cellAlignment === "right"
          ? " [&_:is(td,th)]:text-right"
          : " [&_:is(td,th)]:text-left";
    const caption = str(fields.caption);
    const head = str(fields.head);
    const foot = str(fields.foot);
    const captionEl =
      settings === undefined || settings.showCaption === true || caption.trim()
        ? `<caption data-pb-rich="caption" class="caption-bottom text-sm">${caption}</caption>`
        : "";
    const headEl =
      settings === undefined || settings.showHeader === true || head.trim()
        ? `<thead data-pb-rich="head" class="font-semibold">${head}</thead>`
        : "";
    const footEl =
      settings === undefined || settings.showFooter === true || foot.trim()
        ? `<tfoot data-pb-rich="foot">${foot}</tfoot>`
        : "";
    return `<table data-pb-block="table" class="w-full border-collapse${fixed}${align} [&_:is(td,th)]:border [&_:is(td,th)]:p-2">${captionEl}${headEl}<tbody data-pb-rich="body">${fields.body === undefined ? DEFAULT_BODY : str(fields.body)}</tbody>${footEl}</table>`;
  },
};
