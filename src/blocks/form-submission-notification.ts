// Form submission notification — a message container shown after submit
// (Gutenberg core/form-submission-notification). GB models success/error
// as block VARIATIONS on one type; here the kind is an island setting
// deriving the color treatment. Visibility at runtime is the host's
// (CMS/publr-js) business — the editor always shows it for editing.

import type { BlockDefinition, Fields, Settings } from "../registry";

const KIND_CLASS: Record<string, string> = {
  success: "border-green-600 bg-green-50 text-green-900",
  error: "border-red-600 bg-red-50 text-red-900",
};

export const type = "form-submission-notification";

export const definition: BlockDefinition = {
  label: "Submission notification",
  category: "Widgets",
  icon: "megaphone",
  description: "The message shown after a visitor submits the form.",
  settings: [
    {
      control: "toggle-group",
      label: "Notification type",
      setting: "kind",
      default: "success",
      options: [
        { value: "success", label: "Success" },
        { value: "error", label: "Error" },
      ],
    },
  ],
  render(_fields: Fields, settings?: Settings) {
    const kind = KIND_CLASS[String(settings?.kind)] ?? KIND_CLASS.success;
    return `<div data-pb-block="form-submission-notification" data-pb-children class="rounded-sm border px-4 py-3 ${kind}"></div>`;
  },
};
