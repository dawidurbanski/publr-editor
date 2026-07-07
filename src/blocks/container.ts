// The container family — Group and its layout siblings (Gutenberg's Group /
// Row / Stack / Grid). SEPARATE registered types (each will grow its own
// layout settings later), joined by one shared TRANSFORM setting: its options
// are block types, and picking one switches the block in place
// (editor.transformBlock — id, children, authored classes all survive).
// The root IS the children slot — inner blocks are appended straight into it.
//
// Layout classes are the render's BASELINE (subtracted from authored classes
// on upcast, re-emitted on downcast) — the variant rides the wire as plain
// markup + classes, zero new vocabulary, same trick as toolbar alignment.

import type { BlockDefinition, SettingSpec } from "../registry";

export const CONTAINER_SWITCH: SettingSpec = {
  control: "toggle-group",
  label: "Transform to",
  transform: true,
  options: [
    { value: "group", label: "Group", icon: "group" },
    { value: "row", label: "Row", icon: "row" },
    { value: "stack", label: "Stack", icon: "stack" },
    { value: "grid", label: "Grid", icon: "grid" },
  ],
};

export function containerDefinition(
  type: string,
  label: string,
  description: string,
  classes: string,
): BlockDefinition {
  return {
    label,
    category: "Design",
    icon: type, // group/row/stack/grid share names with the icon set
    description,
    settings: [CONTAINER_SWITCH],
    render() {
      return `<div data-pb-block="${type}"${classes ? ` class="${classes}"` : ""} data-pb-children></div>`;
    },
  };
}
