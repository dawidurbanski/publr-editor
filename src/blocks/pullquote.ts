// Pullquote block — figure with an emphasized quote value + citation
// Unlike quote, the body is one rich value.
// The root is the figure, so the rich carrier needs its own element — a
// root-level rich read would swallow the cite.

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

export const type = "pullquote";

export const definition: BlockDefinition = {
  label: "Pullquote",
  category: "Text",
  icon: "pullquote",
  placeholder: "Add quote…",
  description: "Give special visual emphasis to a quote from your text.",
  supports: TEXT_SUPPORTS,
  toolbar: [
    { control: "text-align", label: "Align text" },
    { control: "toggle-setting", label: "Citation", setting: "showCitation", role: "content" },
  ],
  settings: [
    {
      control: "toggle",
      label: "Citation",
      setting: "showCitation",
      default: false,
      role: "content",
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const citation = str(fields.citation);
    const showCitation =
      settings === undefined || settings.showCitation === true || citation.trim() !== "";
    const cite = showCitation
      ? `<cite data-pb-rich="citation" class="mt-2 block text-sm not-italic">${citation}</cite>`
      : "";
    return `<figure data-pb-block="pullquote" class="border-y py-6 text-center"><blockquote class="text-2xl"><div data-pb-rich="value">${str(fields.value)}</div></blockquote>${cite}</figure>`;
  },
};
