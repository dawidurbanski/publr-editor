// Social links block — a row of social-link icons (Gutenberg
// core/social-links). Color/size treatments are lens/authored-class
// territory; the container just lays the icons out.

import type { BlockDefinition } from "../registry";

export const type = "social-links";

export const definition: BlockDefinition = {
  label: "Social links",
  category: "Widgets",
  icon: "share",
  description: "Display links to your social media profiles.",
  allowedChildren: ["social-link"],
  childTemplate: ["social-link"],
  render() {
    return `<div data-pb-block="social-links" data-pb-children class="flex flex-wrap items-center gap-3"></div>`;
  },
};
