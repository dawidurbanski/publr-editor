// Accordion block — a stack of accordion-item disclosures. DELIBERATE
// CONTRACT-LEVEL DIVERGENCE from Gutenberg (story #370, recorded in epic
// #333): GB's stable model is a 4-block family — accordion / accordion-item
// / accordion-heading / accordion-panel — because its markup (heading +
// panel divs + Interactivity-API JS) has no native disclosure to lean on.
// Publr's wire contract prefers platform semantics, so the family collapses
// to 2 blocks on details/summary (the pattern the details block
// established): the summary IS the heading, the details body IS the panel —
// no JS, works published as-is. The GB attributes that exist to serve its
// markup are dropped one by one:
// - autoclose: DEFERRED, not rejected — native exclusive grouping (details
//   name="…") needs a per-instance unique name the render cannot mint (it
//   sees only fields/settings, never the block id).
// - headingLevel: no heading element exists here; the summary is the
//   disclosure's label, not an outline entry.
// - iconPosition/showIcon: the marker is ::marker/::details-content
//   territory — styling covered by authored classes.

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
