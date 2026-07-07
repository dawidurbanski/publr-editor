// Buttons block — a flex row of button blocks (Gutenberg core/buttons).
// Justify/gap are island-canonical; the derived classes sit on the inner
// slot row (whitelisted tokens).

import type { BlockDefinition, Fields, Settings } from "../registry";

const JUSTIFY_CLASS: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

const GAP_CLASS: Record<string, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-8",
};

export const type = "buttons";

export const definition: BlockDefinition = {
  label: "Buttons",
  category: "Design",
  icon: "buttons",
  description: "Prompt visitors to take action with a group of button-style links.",
  allowedChildren: ["button"],
  childTemplate: ["button"],
  settings: [
    {
      control: "toggle-group",
      label: "Justification",
      setting: "justify",
      default: "start",
      options: [
        { value: "start", label: "Left" },
        { value: "center", label: "Center" },
        { value: "end", label: "Right" },
        { value: "between", label: "Space between" },
      ],
    },
    {
      control: "toggle-group",
      label: "Gap",
      setting: "gap",
      default: "sm",
      options: [
        { value: "none", label: "None" },
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const justify = JUSTIFY_CLASS[String(settings?.justify)] ?? "justify-start";
    const gap = GAP_CLASS[String(settings?.gap)] ?? "gap-2";
    return `<div data-pb-block="buttons" data-pb-children class="flex flex-wrap items-center ${justify} ${gap}"></div>`;
  },
};
