// Paragraph block — one rich body (Gutenberg core/paragraph). dropCap and
// direction are island-canonical; the first-letter classes and the dir
// attribute the render emits are derived presentation.

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

export const type = "paragraph";

export const definition: BlockDefinition = {
  label: "Paragraph",
  category: "Text",
  icon: "paragraph",
  description: "Start with the basic building block of all narrative.",
  supports: {
    typography: {
      fontSize: true,
      lineHeight: true,
      letterSpacing: true,
      decoration: true,
      letterCase: true,
    },
    color: { text: true, background: true },
    spacing: { padding: true, margin: true },
    border: { width: true, color: true, radius: true },
  },
  variations: [
    { name: "display", label: "Display", class: "text-3xl font-bold leading-tight" },
    { name: "subtitle", label: "Subtitle", class: "text-lg text-neutral-500" },
    { name: "annotation", label: "Annotation", class: "text-sm text-neutral-500 italic" },
  ],
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
    return `<p data-pb-block="paragraph" data-pb-rich="body"${dir}${drop}>${str(fields.body)}</p>`;
  },
};
