// Group block — the plain layout container (Gutenberg core/group).

import { containerDefinition } from "./container";

export const type = "group";

export const definition = containerDefinition(
  type,
  "Group",
  "Gather blocks in a layout container.",
  "",
);
