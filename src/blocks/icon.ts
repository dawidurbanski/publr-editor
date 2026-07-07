// Icon block — span whose rich carrier holds inline SVG markup. Rotation
// and flips are island-canonical; the derived transform utilities compose
// (each sets its own transform channel), so a plain icon's rendering is
// untouched. noSplit: Enter inside SVG markup is never a block split.

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const ROTATE_CLASS: Record<string, string> = {
  "90": "rotate-90",
  "180": "rotate-180",
  "270": "rotate-[270deg]",
};

const DEFAULT_SVG =
  '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5"><circle cx="10" cy="10" r="8"></circle></svg>';

export const type = "icon";

export const definition: BlockDefinition = {
  label: "Icon",
  category: "Media",
  icon: "symbol",
  description: "Display an inline SVG icon.",
  noSplit: ["svg"],
  settings: [
    {
      control: "select",
      label: "Rotation",
      setting: "rotation",
      default: "0",
      options: [
        { value: "0", label: "0°" },
        { value: "90", label: "90°" },
        { value: "180", label: "180°" },
        { value: "270", label: "270°" },
      ],
    },
    { control: "toggle", label: "Flip horizontally", setting: "flipHorizontal", default: false },
    { control: "toggle", label: "Flip vertically", setting: "flipVertical", default: false },
  ],
  render(fields: Fields, settings?: Settings) {
    const classes = [
      "inline-block",
      ROTATE_CLASS[String(settings?.rotation)] ?? "",
      settings?.flipHorizontal === true ? "-scale-x-100" : "",
      settings?.flipVertical === true ? "-scale-y-100" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<span data-pb-block="icon" data-pb-rich="svg" class="${classes}">${fields.svg === undefined ? DEFAULT_SVG : str(fields.svg)}</span>`;
  },
};
