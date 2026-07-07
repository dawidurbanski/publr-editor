// Columns block — horizontal layout of column blocks (Gutenberg
// core/columns). A fresh columns starts with two (GB's default variation);
// the slot accepts columns only. valign/gap/stackOnMobile are
// island-canonical, derived onto the root as whitelisted tokens.

import type { BlockDefinition, Fields, Settings } from "../registry";

const VALIGN_CLASS: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

const GAP_CLASS: Record<string, string> = {
  none: "gap-0",
  sm: "gap-2.5",
  md: "gap-5",
  lg: "gap-10",
};

export const type = "columns";

export const definition: BlockDefinition = {
  label: "Columns",
  category: "Design",
  icon: "columns",
  description: "Display content in multiple columns.",
  allowedChildren: ["column"],
  childTemplate: ["column", "column"],
  settings: [
    {
      control: "toggle-group",
      label: "Vertical alignment",
      setting: "valign",
      default: "top",
      options: [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
      ],
    },
    {
      control: "toggle-group",
      label: "Gap",
      setting: "gap",
      default: "md",
      options: [
        { value: "none", label: "None" },
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
    },
    { control: "toggle", label: "Stack on mobile", setting: "stackOnMobile", default: true },
  ],
  render(_fields: Fields, settings?: Settings) {
    const valign = VALIGN_CLASS[String(settings?.valign)] ?? "items-start";
    const gap = GAP_CLASS[String(settings?.gap)] ?? "gap-5";
    const stack = settings?.stackOnMobile === false ? "" : " max-md:flex-col";
    return `<div data-pb-block="columns" data-pb-children class="flex ${valign} ${gap}${stack}"></div>`;
  },
};
