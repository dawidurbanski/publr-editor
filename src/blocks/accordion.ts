// Accordion block — a stack of accordion-item disclosures (Gutenberg
// core/accordion). GB's item/heading/panel triple collapses onto native
// details/summary markup — the pattern the details block established.
// Autoclose is deferred: native exclusive grouping (details name="…")
// needs a per-instance unique name the render cannot mint (it sees only
// fields/settings, never the block id). GB's iconPosition/showIcon are
// styling concerns covered by authored classes.

import type { BlockDefinition } from "../registry";

export const type = "accordion";

export const definition: BlockDefinition = {
  label: "Accordion",
  category: "Design",
  icon: "accordion",
  description: "A vertically stacked set of collapsible content sections.",
  allowedChildren: ["accordion-item"],
  childTemplate: ["accordion-item"],
  render() {
    return `<div data-pb-block="accordion" data-pb-children class="flex flex-col [&>details+details]:border-t-0"></div>`;
  },
};
