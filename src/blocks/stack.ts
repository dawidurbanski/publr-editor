// Stack block — vertical container variant (Gutenberg Group → Stack).

import { containerDefinition } from "./container";

export const type = "stack";

export const definition = containerDefinition(
  type,
  "Stack",
  "Arrange blocks vertically.",
  "flex flex-col",
);
