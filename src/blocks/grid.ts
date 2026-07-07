// Grid block — grid container variant (Gutenberg Group → Grid).

import { containerDefinition } from "./container";

export const type = "grid";

export const definition = containerDefinition(
  type,
  "Grid",
  "Arrange blocks in a grid.",
  "grid grid-cols-2",
);
