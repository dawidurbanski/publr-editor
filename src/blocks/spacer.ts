// Spacer block — vertical gap via a settings token (Gutenberg core/spacer).
// A settings token, not an authored class: a bare spacer must be visible
// the moment it's inserted. Arbitrary heights via authored h-[…] utilities
// still win over the baseline. GB's px height/width resizing is skipped —
// authored classes / lenses cover it (documented scope decision).

import type { BlockDefinition, Fields, Settings } from "../registry";

const HEIGHT_CLASS: Record<string, string> = {
  sm: "h-3",
  md: "h-6",
  lg: "h-12",
  xl: "h-24",
};

export const type = "spacer";

export const definition: BlockDefinition = {
  label: "Spacer",
  category: "Design",
  icon: "spacer",
  description: "Add white space between blocks.",
  settings: [
    {
      control: "toggle-group",
      label: "Height",
      setting: "height",
      default: "md",
      options: [
        { value: "sm", label: "S" },
        { value: "md", label: "M" },
        { value: "lg", label: "L" },
        { value: "xl", label: "XL" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const h = HEIGHT_CLASS[String(settings?.height)] ?? "h-6";
    return `<div data-pb-block="spacer" aria-hidden="true" class="block ${h}"></div>`;
  },
};
