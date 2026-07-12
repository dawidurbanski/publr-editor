// The container family — Group and its layout siblings (Row / Stack /
// Grid). SEPARATE registered types (each will grow its own
// layout settings later), joined by one shared TRANSFORM setting: its options
// are block types, and picking one switches the block in place
// (editor.transformBlock — id, children, authored classes all survive).
// The root IS the children slot — inner blocks are appended straight into it.
//
// Layout classes are the render's BASELINE (subtracted from authored classes
// on upcast, re-emitted on downcast) — the variant rides the wire as plain
// markup + classes, zero new vocabulary, same trick as toolbar alignment.
//
// The group's tagName is modeled as a TAG CARRIER on the root
// (story #370, retiring the invented section block): the semantic element
// rides the wire as markup, switched from the sidebar. Row/Stack/Grid are
// variations of one container family, so tagName belongs to the whole
// family here too. Fields carry over transformBlock by name — the chosen
// tag survives group ⇄ row/stack/grid.

import type { BlockDefinition, Fields, SettingSpec } from "../registry";
import { ALIGN_ITEMS, FLEX_WRAPS, JUSTIFY_CONTENT } from "../style";
import { LAYOUT_SUPPORTS } from "./supports";

export const CONTAINER_SWITCH: SettingSpec = {
  control: "toggle-group",
  label: "Transform to",
  transform: true,
  role: "structure",
  options: [
    { value: "group", label: "Group", icon: "group" },
    { value: "row", label: "Row", icon: "row" },
    { value: "stack", label: "Stack", icon: "stack" },
    { value: "grid", label: "Grid", icon: "grid" },
  ],
};

// The conventional tag offering for a group container — plus nav and dl
// (real-world templates use them as pure layout containers: nav link rows,
// dl stat/definition grids; the Tailwind Plus stress fixture has three dl
// groups). An out-of-list tag renders as div, so admitting a tag here is
// what makes its round-trip exact.
const TAGS = ["div", "header", "main", "section", "article", "aside", "footer", "nav", "dl"];

const CONTAINER_TAG: SettingSpec = {
  control: "toggle-group",
  label: "HTML element",
  field: "tag",
  role: "structure",
  options: TAGS.map((t) => ({ value: t, label: t })),
};

export function containerDefinition(
  type: string,
  label: string,
  description: string,
  classes: string,
): BlockDefinition {
  const layoutSupports = {
    ...LAYOUT_SUPPORTS,
    layout: {
      ...LAYOUT_SUPPORTS.layout,
      ...(type === "row" ? { flexWrap: true } : {}),
      ...(type === "grid"
        ? { gridColumns: { values: ["1", "2", "3", "4", "5", "6"], allowCustom: true } }
        : {}),
    },
  };
  const layoutToolbar =
    type === "group"
      ? []
      : [
          {
            control: "style-options" as const,
            label: "Change justification",
            style: "justifyContent",
            options: JUSTIFY_CONTENT.map(({ key, label }) => ({ value: key, label })),
          },
          {
            control: "style-options" as const,
            label: "Change vertical alignment",
            style: "alignItems",
            options: ALIGN_ITEMS.map(({ key, label }) => ({ value: key, label })),
          },
          ...(type === "row"
            ? [
                {
                  control: "style-options" as const,
                  label: "Change wrapping",
                  style: "flexWrap",
                  options: FLEX_WRAPS.map(({ key, label }) => ({ value: key, label })),
                },
              ]
            : []),
          ...(type === "grid"
            ? [
                {
                  control: "style-options" as const,
                  label: "Change columns",
                  style: "gridColumns",
                  options: ["1", "2", "3", "4", "5", "6"].map((value) => ({
                    value,
                    label: value,
                  })),
                },
              ]
            : []),
        ];
  return {
    label,
    category: "Design",
    icon: type, // group/row/stack/grid share names with the icon set
    description,
    supports: layoutSupports,
    toolbar: [
      {
        control: "transform-options",
        label: "Change layout",
        options: CONTAINER_SWITCH.options,
      },
      ...layoutToolbar,
    ],
    settings: [CONTAINER_SWITCH, CONTAINER_TAG],
    render(fields: Fields) {
      const tag = typeof fields.tag === "string" && TAGS.includes(fields.tag) ? fields.tag : "div";
      return `<${tag} data-pb-block="${type}" data-pb-tag="tag"${classes ? ` class="${classes}"` : ""} data-pb-children></${tag}>`;
    },
  };
}
