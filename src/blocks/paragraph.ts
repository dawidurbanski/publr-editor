// Paragraph block — one rich body (Gutenberg core/paragraph). dropCap and
// direction are island-canonical; the first-letter classes and the dir
// attribute the render emits are derived presentation.

import type { BlockDefinition, Fields, Settings } from "../registry";

export const type = "paragraph";

export const definition: BlockDefinition = {
  label: "Paragraph",
  category: "Text",
  icon: "paragraph",
  description: "Start with the basic building block of all narrative.",
  settings: [
    { control: "toggle", label: "Drop cap", setting: "dropCap", default: false },
    {
      control: "toggle-group",
      label: "Text direction",
      setting: "direction",
      default: "auto",
      options: [
        { value: "auto", label: "Auto" },
        { value: "ltr", label: "LTR" },
        { value: "rtl", label: "RTL" },
      ],
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const dir =
      settings?.direction === "ltr" || settings?.direction === "rtl"
        ? ` dir="${settings.direction}"`
        : "";
    const drop =
      settings?.dropCap === true
        ? ` class="first-letter:float-left first-letter:pr-2 first-letter:text-[3.4em] first-letter:leading-[0.85] first-letter:font-bold"`
        : "";
    return `<p data-pb-block="paragraph" data-pb-rich="body"${dir}${drop}>${fields.body ?? ""}</p>`;
  },
};
