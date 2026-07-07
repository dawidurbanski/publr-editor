// Separator block — hr (Gutenberg core/separator). GB's opacity and
// tagName div are skipped: authored classes / lenses cover both
// (documented scope decision on story #338).

import type { BlockDefinition } from "../registry";

export const type = "separator";

export const definition: BlockDefinition = {
  label: "Separator",
  category: "Design",
  icon: "separator",
  description: "Create a break between ideas or sections with a horizontal separator.",
  render() {
    return `<hr data-pb-block="separator" class="border-0 border-t border-neutral-300">`;
  },
};
