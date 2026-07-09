// Core pattern library — named block compositions the inserter stamps into
// the document as independent copies (pure composition, no reference — the
// future synced concept is Symbols, thoughts/011, Phase E/F). Same
// registration story as the core blocks: everything goes through the public
// registerPattern, and hosts import this module deliberately (never via
// src/index.ts).
//
// Each fragment is ordinary wire-contract HTML — one or more roots; the
// stamp wraps them in the PHANTOM pattern root (src/blocks/pattern-root.ts),
// which carries the instance's identity, so fragments themselves stay
// provenance-free. A fragment needing a styled wrapper includes its own
// group (hero, call-to-action); one that doesn't ships bare roots
// (testimonials). Register AFTER the core blocks: registration validates
// that the fragment expands to registered types only.

import { registerPattern } from "../patterns";
import type { PatternDefinition } from "../patterns";

/** [name, definition] in registration (= inserter) order. */
export const CORE_PATTERNS: readonly [string, PatternDefinition][] = [
  [
    "hero",
    {
      label: "Hero",
      category: "Banners",
      icon: "cover",
      description: "Big opening headline with supporting copy and a pair of calls to action.",
      content: `
<section data-pb-block="group" data-pb-tag="tag" data-pb-children class="text-center">
  <h1 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Tell your story</h1>
  <p data-pb-block="paragraph" data-pb-rich="body">Introduce the big idea in a sentence or two, then invite people to dig in.</p>
  <div data-pb-block="buttons" data-pb-children><script type="application/json" data-pb-settings>{"justify":"center"}</script>
    <a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="#">Get started</a>
    <a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="#"><script type="application/json" data-pb-settings>{"style":"outline"}</script>Learn more</a>
  </div>
</section>`,
    },
  ],
  [
    "call-to-action",
    {
      label: "Call to action",
      category: "Call to action",
      icon: "buttons",
      description: "Heading, one persuasive line, and a button.",
      content: `
<section data-pb-block="group" data-pb-tag="tag" data-pb-children class="text-center">
  <h2 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Ready when you are</h2>
  <p data-pb-block="paragraph" data-pb-rich="body">One line that removes the last doubt.</p>
  <div data-pb-block="buttons" data-pb-children><script type="application/json" data-pb-settings>{"justify":"center"}</script>
    <a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="#">Start now</a>
  </div>
</section>`,
    },
  ],
  [
    "features",
    {
      label: "Feature columns",
      category: "Columns",
      icon: "columns",
      description: "Three columns, each a small heading over a short explanation.",
      content: `
<div data-pb-block="columns" data-pb-children>
  <div data-pb-block="column" data-pb-children>
    <h3 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Fast</h3>
    <p data-pb-block="paragraph" data-pb-rich="body">Explain the first thing people get.</p>
  </div>
  <div data-pb-block="column" data-pb-children>
    <h3 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Simple</h3>
    <p data-pb-block="paragraph" data-pb-rich="body">Explain the second thing people get.</p>
  </div>
  <div data-pb-block="column" data-pb-children>
    <h3 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Yours</h3>
    <p data-pb-block="paragraph" data-pb-rich="body">Explain the third thing people get.</p>
  </div>
</div>`,
    },
  ],
  [
    "testimonials",
    {
      label: "Two testimonials",
      category: "Testimonials",
      icon: "quote",
      description: "A heading over two quoted voices side by side.",
      content: `
<h2 data-pb-block="heading" data-pb-tag="level" data-pb-text="text" class="text-center">What people say</h2>
<div data-pb-block="columns" data-pb-children>
  <div data-pb-block="column" data-pb-children>
    <blockquote data-pb-block="quote"><div data-pb-rich="body">Exactly the tool I did not know I needed.</div><cite data-pb-text="citation">Alex, maker</cite></blockquote>
  </div>
  <div data-pb-block="column" data-pb-children>
    <blockquote data-pb-block="quote"><div data-pb-rich="body">Set up in minutes, shipped the same day.</div><cite data-pb-text="citation">Sam, founder</cite></blockquote>
  </div>
</div>`,
    },
  ],
];

/** Register the core pattern set — call after registerCoreBlocks(). */
export function registerCorePatterns(): void {
  for (const [name, def] of CORE_PATTERNS) registerPattern(name, def);
}
