// Row block — horizontal container variant of Group.
// [&>*]:flex-1 — children share the row evenly (equal widths are the only
// distribution for now; per-child sizing arrives with the variant's own
// settings). Rides the wire like any baseline class — published output
// gets the same layout, zero editor-only styling.

import { containerDefinition } from "./container";

export const type = "row";

export const definition = containerDefinition(
  type,
  "Row",
  "Arrange blocks horizontally.",
  "flex flex-row [&>*]:flex-1",
);
