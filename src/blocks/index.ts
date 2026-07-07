// Core block library — one file per block, each exporting { type, definition }.
// This module is deliberately NOT re-exported from src/index.ts: the editor
// engine ships without an opinion about the block set; hosts (the demos, the
// CMS) import this library and call registerCoreBlocks(), or cherry-pick.
//
// Even these "core" blocks go through the public registration API — there is
// no privileged path: Publr core, plugins, and the devtools console all call
// registerBlock the same way.

import { registerBlock } from "../registry";
import type { BlockDefinition } from "../registry";

// text
import * as heading from "./heading";
import * as paragraph from "./paragraph";
import * as list from "./list";
import * as listItem from "./list-item";
import * as quote from "./quote";
import * as pullquote from "./pullquote";
import * as code from "./code";
import * as preformatted from "./preformatted";
import * as verse from "./verse";
import * as table from "./table";
import * as details from "./details";
import * as math from "./math";
// design (containers)
import * as group from "./group";
import * as row from "./row";
import * as stack from "./stack";
import * as grid from "./grid";

/** [type, definition] in registration (= inserter) order. */
export const coreBlocks: readonly (readonly [string, BlockDefinition])[] = [
  [heading.type, heading.definition],
  [paragraph.type, paragraph.definition],
  [list.type, list.definition],
  [listItem.type, listItem.definition],
  [quote.type, quote.definition],
  [pullquote.type, pullquote.definition],
  [code.type, code.definition],
  [preformatted.type, preformatted.definition],
  [verse.type, verse.definition],
  [table.type, table.definition],
  [details.type, details.definition],
  [math.type, math.definition],
  [group.type, group.definition],
  [row.type, row.definition],
  [stack.type, stack.definition],
  [grid.type, grid.definition],
];

/** Register the whole core set (idempotence is the caller's business — registerBlock throws on duplicates). */
export function registerCoreBlocks(): void {
  for (const [type, definition] of coreBlocks) registerBlock(type, definition);
}
