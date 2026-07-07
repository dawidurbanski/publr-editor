// Column block — one column (Gutenberg core/column: width + self
// alignment). Internal: created through the columns block's template and
// tree UI, never the inserter. The root is the children slot.

import type { BlockDefinition, Fields, Settings } from "../registry";

const WIDTH_CLASS: Record<string, string> = {
  auto: "flex-1",
  "25": "shrink-0 basis-1/4",
  "33": "shrink-0 basis-1/3",
  "50": "shrink-0 basis-1/2",
  "66": "shrink-0 basis-2/3",
  "75": "shrink-0 basis-3/4",
};

const VALIGN_CLASS: Record<string, string> = {
  top: "self-start",
  center: "self-center",
  bottom: "self-end",
};

export const type = "column";

export const definition: BlockDefinition = {
  label: "Column",
  category: "Design",
  icon: "column",
  internal: true,
  settings: [
    {
      control: "toggle-group",
      label: "Width",
      setting: "width",
      default: "auto",
      options: [
        { value: "auto", label: "Auto" },
        { value: "25", label: "25%" },
        { value: "33", label: "33%" },
        { value: "50", label: "50%" },
        { value: "66", label: "66%" },
        { value: "75", label: "75%" },
      ],
    },
    {
      control: "toggle-group",
      label: "Vertical alignment",
      setting: "valign",
      default: "inherit",
      options: [
        { value: "inherit", label: "Inherit" },
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const classes = ["min-w-0", WIDTH_CLASS[String(settings?.width)] ?? "flex-1"];
    const valign = VALIGN_CLASS[String(settings?.valign)];
    if (valign) classes.push(valign);
    return `<div data-pb-block="column" data-pb-children class="${classes.join(" ")}"></div>`;
  },
};
