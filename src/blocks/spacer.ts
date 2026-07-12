// Spacer block — vertical gap via a settings token.
// A settings token, not an authored class: a bare spacer must be visible
// the moment it's inserted. Arbitrary heights via authored h-[…] utilities
// still win over the baseline. Px height/width resizing is skipped —
// authored classes / lenses cover it (documented scope decision).

import type { BlockDefinition, Fields, Settings } from "../registry";

const HEIGHT_CLASS: Record<string, string> = {
  sm: "pbe-spacer--sm",
  md: "pbe-spacer--md",
  lg: "pbe-spacer--lg",
  xl: "pbe-spacer--xl",
};

export const type = "spacer";

export const definition: BlockDefinition = {
  label: "Spacer",
  category: "Design",
  icon: "spacer",
  description: "Add white space between blocks.",
  supports: {
    spacing: { margin: true },
    dimensions: { width: { default: false }, height: true },
  },
  toolbar: [
    {
      control: "setting-options",
      label: "Change height",
      setting: "height",
      options: [
        { value: "sm", label: "S" },
        { value: "md", label: "M" },
        { value: "lg", label: "L" },
        { value: "xl", label: "XL" },
      ],
      role: "design",
    },
  ],
  settings: [
    {
      control: "toggle-group",
      label: "Height",
      setting: "height",
      default: "md",
      role: "design",
      options: [
        { value: "sm", label: "S" },
        { value: "md", label: "M" },
        { value: "lg", label: "L" },
        { value: "xl", label: "XL" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const height = HEIGHT_CLASS[String(settings?.height)] ?? HEIGHT_CLASS.md;
    return `<div data-pb-block="spacer" aria-hidden="true" class="pbe-spacer block ${height}"></div>`;
  },
};
