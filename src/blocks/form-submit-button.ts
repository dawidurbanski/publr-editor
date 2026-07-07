// Form submit button — a real <button type="submit"> with a rich label
// (Gutenberg core/form-submit-button). This is the tagName-button case the
// button block deliberately left out: anchors navigate, buttons submit.

import { str } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

export const type = "form-submit-button";

export const definition: BlockDefinition = {
  label: "Submit button",
  category: "Widgets",
  icon: "send",
  placeholder: "Submit",
  description: "A button that submits the form.",
  render(fields: Fields) {
    return `<button type="submit" data-pb-block="form-submit-button" data-pb-rich="label" class="inline-block cursor-pointer self-start rounded-sm bg-[var(--color-accent,#3858e9)] px-4 py-2 font-medium text-white">${fields.label === undefined ? "Submit" : str(fields.label)}</button>`;
  },
};
