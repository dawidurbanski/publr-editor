// Details block — native disclosure: rich summary + nested content blocks
// (Gutenberg core/details). `open` (GB showContent) and the exclusive-
// accordion `name` are island-canonical; the attributes the render emits
// are derived presentation, regenerated on every downcast. The canvas keeps
// closed details editable (chrome.css ::details-content).

import { escAttr, str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

export const type = "details";

export const definition: BlockDefinition = {
  label: "Details",
  category: "Text",
  icon: "details",
  placeholder: "Write summary…",
  description: "Hide and show additional content.",
  settings: [
    { control: "toggle", label: "Open by default", setting: "open", default: false },
    {
      control: "text",
      label: "Accordion group name",
      setting: "name",
      default: "",
      placeholder: "group name",
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const name =
      typeof settings?.name === "string" && settings.name.trim()
        ? ` name="${escAttr(settings.name.trim())}"`
        : "";
    const open = settings?.open === true ? " open" : "";
    return `<details data-pb-block="details" class="rounded-sm border px-4 py-2"${open}${name}><summary data-pb-rich="summary" class="cursor-pointer font-semibold">${str(fields.summary)}</summary><div data-pb-children class="mt-2"></div></details>`;
  },
};
