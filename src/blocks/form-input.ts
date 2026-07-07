// Form input block — label + input (Gutenberg core/form-input). The label
// is the rich carrier; everything about the INPUT is island-canonical and
// derived (type/name/required/placeholder — an input's value is runtime
// user data, never content). textarea and checkbox variants swap the
// markup. GB's inlineLabel/value/visibilityPermissions are dropped.
//
// GB scopes this block to core/form ancestors; ancestor constraints don't
// exist here (only parent-side allow-lists), so the block stays insertable
// and simply renders an inert field outside a form.

import { escAttr, str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const TYPES = ["text", "email", "url", "tel", "number", "password", "date", "textarea", "checkbox"];

const INPUT_CLASS =
  "w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-accent,#3858e9)] focus:outline-none";

export const type = "form-input";

export const definition: BlockDefinition = {
  label: "Input field",
  category: "Widgets",
  icon: "pencil",
  placeholder: "Label",
  description: "The basic building block for forms.",
  settings: [
    {
      control: "select",
      label: "Field type",
      setting: "type",
      default: "text",
      options: TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      control: "text",
      label: "Field name",
      setting: "name",
      default: "",
      placeholder: "e.g. email",
    },
    { control: "toggle", label: "Required", setting: "required", default: false },
    { control: "text", label: "Input placeholder", setting: "placeholder", default: "" },
  ],
  render(fields: Fields, settings?: Settings) {
    const t = TYPES.includes(String(settings?.type)) ? String(settings?.type) : "text";
    const name =
      typeof settings?.name === "string" && settings.name.trim()
        ? ` name="${escAttr(settings.name.trim())}"`
        : "";
    const required = settings?.required === true ? " required" : "";
    const ph =
      typeof settings?.placeholder === "string" && settings.placeholder.trim()
        ? ` placeholder="${escAttr(settings.placeholder.trim())}"`
        : "";
    const label = `<span data-pb-rich="label" class="text-sm font-medium">${str(fields.label)}</span>`;
    if (t === "checkbox")
      return `<label data-pb-block="form-input" class="flex items-center gap-2"><input type="checkbox"${name}${required}>${label}</label>`;
    const control =
      t === "textarea"
        ? `<textarea${name}${required}${ph} rows="4" class="${INPUT_CLASS}"></textarea>`
        : `<input type="${t}"${name}${required}${ph} class="${INPUT_CLASS}">`;
    return `<label data-pb-block="form-input" class="flex flex-col gap-1.5">${label}${control}</label>`;
  },
};
