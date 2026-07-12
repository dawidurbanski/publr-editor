// List block — ul/ol root whose items are list-item child blocks.
// The root is BOTH the tag carrier and the children slot: li
// must be direct children of the list element, and a tag carrier reads only
// the tagName, never the content. The items slot accepts list-item alone —
// Enter inside an item splits into a same-type sibling, a fresh list seeds
// one empty item (childTemplate). The ol-only settings (reversed / start /
// type) are island-canonical; the attributes AND the list-style class the
// render emits are derived presentation, regenerated on every downcast.

import type { BlockDefinition, Fields, Settings } from "../registry";
import { TEXT_SUPPORTS } from "./supports";

const MARKERS = ["1", "a", "A", "i", "I"] as const;

// type token → list-style-type utility. The class drives the canvas (the
// demo's preflight resets list styles); the type attribute keeps the
// published markup meaningful without any CSS.
const MARKER_CLASS: Record<string, string> = {
  "1": "list-decimal",
  a: "list-[lower-alpha]",
  A: "list-[upper-alpha]",
  i: "list-[lower-roman]",
  I: "list-[upper-roman]",
};

export const type = "list";

export const definition: BlockDefinition = {
  label: "List",
  category: "Text",
  icon: "list",
  description: "An organized collection of items displayed in a specific order.",
  supports: TEXT_SUPPORTS,
  allowedChildren: ["list-item"],
  childTemplate: ["list-item"],
  toolbar: [
    {
      control: "field-options",
      label: "List style",
      field: "tag",
      options: [
        { value: "ul", label: "Unordered", icon: "list-unordered" },
        { value: "ol", label: "Ordered", icon: "list-ordered" },
      ],
    },
    { control: "add-child", label: "Add list item", type: "list-item" },
  ],
  settings: [
    {
      control: "toggle-group",
      label: "List style",
      field: "tag",
      role: "structure",
      options: [
        { value: "ul", label: "Unordered", icon: "list-unordered" },
        { value: "ol", label: "Ordered", icon: "list-ordered" },
      ],
    },
    {
      control: "toggle",
      label: "Reverse order",
      setting: "reversed",
      default: false,
      role: "structure",
      when: { field: "tag", equals: "ol" },
      help: "Display ordered items in descending order.",
    },
    {
      control: "number",
      label: "Start value",
      setting: "start",
      default: 1,
      step: 1,
      role: "structure",
      when: { field: "tag", equals: "ol" },
      help: "Set the first number used by the ordered list.",
    },
    {
      control: "select",
      label: "Numbering style",
      setting: "type",
      default: "1",
      role: "structure",
      when: { field: "tag", equals: "ol" },
      options: [
        { value: "1", label: "Numbers (1 2 3)" },
        { value: "a", label: "Lowercase letters (a b c)" },
        { value: "A", label: "Uppercase letters (A B C)" },
        { value: "i", label: "Lowercase Roman (i ii iii)" },
        { value: "I", label: "Uppercase Roman (I II III)" },
      ],
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const tag = fields.tag === "ol" ? "ol" : "ul";
    let attrs = "";
    let marker = "list-disc";
    if (tag === "ol") {
      const t = MARKERS.includes(settings?.type as (typeof MARKERS)[number])
        ? String(settings!.type)
        : "1";
      marker = MARKER_CLASS[t];
      if (settings?.reversed === true) attrs += " reversed";
      const start = Number(settings?.start);
      if (Number.isFinite(start) && start !== 1) attrs += ` start="${Math.trunc(start)}"`;
      if (t !== "1") attrs += ` type="${t}"`;
    }
    return `<${tag} data-pb-block="list" data-pb-tag="tag" data-pb-children class="${marker} pl-6"${attrs}></${tag}>`;
  },
};
