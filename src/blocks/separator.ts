// Separator block — hr. Opacity and
// tagName div settings are skipped: authored classes / lenses cover both
// (documented scope decision on story #338).

import type { BlockDefinition } from "../registry";
import { MEDIA_SUPPORTS } from "./supports";

export const type = "separator";

export const definition: BlockDefinition = {
  label: "Separator",
  category: "Design",
  icon: "separator",
  description: "Create a break between ideas or sections with a horizontal separator.",
  supports: MEDIA_SUPPORTS,
  toolbar: [],
  variations: [
    { name: "wide", label: "Wide", class: "mx-auto w-1/2" },
    { name: "dots", label: "Dots", class: "border-t-4 border-dotted" },
  ],
  render() {
    return `<hr data-pb-block="separator" class="border-0 border-t border-neutral-300">`;
  },
};
