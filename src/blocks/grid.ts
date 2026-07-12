// Grid block — grid container variant of Group.

import { containerDefinition } from "./container";

export const type = "grid";

export const definition = containerDefinition(
  type,
  "Grid",
  "Arrange blocks in a grid.",
  "grid pbe-grid--2",
);
