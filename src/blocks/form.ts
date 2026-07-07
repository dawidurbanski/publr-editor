// Form block — a form container (Gutenberg core/form, experimental): the
// root IS the slot, seeded with one input + a submit button. action/method
// are island-canonical, derived onto the root. GB's submissionMethod/email
// (WP submission plumbing) are dropped — where a submission lands is the
// CMS's business, carried by action/method alone.

import { escAttr } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

export const type = "form";

export const definition: BlockDefinition = {
  label: "Form",
  category: "Widgets",
  icon: "envelope",
  description: "A form for visitors to submit — inputs, a submit button, notifications.",
  // GB's allowedBlocks list, mapped to our types
  allowedChildren: [
    "paragraph",
    "heading",
    "form-input",
    "form-submit-button",
    "form-submission-notification",
    "group",
    "columns",
  ],
  childTemplate: ["form-input", "form-submit-button"],
  settings: [
    {
      control: "text",
      label: "Action URL",
      setting: "action",
      default: "",
      placeholder: "/submit",
    },
    {
      control: "select",
      label: "Method",
      setting: "method",
      default: "post",
      options: [
        { value: "post", label: "POST" },
        { value: "get", label: "GET" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const action =
      typeof settings?.action === "string" && settings.action.trim()
        ? ` action="${escAttr(settings.action.trim())}"`
        : "";
    const method = settings?.method === "get" ? ` method="get"` : ` method="post"`;
    return `<form data-pb-block="form" data-pb-children${action}${method} class="flex flex-col gap-4"></form>`;
  },
};
