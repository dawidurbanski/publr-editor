// The homepage sliced into per-section patterns (Phase B over real content).
// Each fragment must register (validation expands to registered types only)
// and stamp into a document, and the seven together must reconstruct the same
// block census as the monolithic fixture — a pattern is a copy, so composing
// the patterns == the page.

import { describe, expect, test } from "vitest";
import { getPattern, upcast } from "../src/index";
import type { Block } from "../src/index";
import { registerCoreBlocks } from "../src/blocks";
import { registerCorePatterns } from "../src/blocks/core-patterns";
import { HOMEPAGE_PATTERNS, registerHomepagePatterns } from "../src/blocks/homepage-patterns";

registerCoreBlocks();
registerCorePatterns();
registerHomepagePatterns();

function parse(html: string): Element {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp;
}
function census(blocks: Block[], c: Record<string, number> = {}): Record<string, number> {
  for (const b of blocks) {
    c[b.type] = (c[b.type] ?? 0) + 1;
    if (b.children) census(b.children, c);
  }
  return c;
}

describe("homepage section patterns", () => {
  test("all seven register (fragments validate to registered types)", () => {
    expect(HOMEPAGE_PATTERNS.map(([n]) => n)).toEqual([
      "home-hero",
      "home-logo-cloud",
      "home-feature-cards",
      "home-feature-showcase",
      "home-stats",
      "home-cta",
      "home-footer",
    ]);
    for (const [name] of HOMEPAGE_PATTERNS) {
      const p = getPattern(name)!;
      expect(p, name).toBeTruthy();
      expect(p.category, name).toBeTruthy();
      // The content upcasts to a single section root (typed, not raw-html).
      const blocks = upcast(parse(p.content)).blocks;
      expect(blocks.length, name).toBe(1);
      expect(["group", "raw-html"], name).toContain(blocks[0].type);
      expect(blocks[0].type, name).toBe("group"); // every section roots in a group/footer
    }
  });

  test("every pattern root carries a background (self-contained, not transparent)", () => {
    // The sections were designed on the page's bg-gray-900 shell; standalone
    // (preview, insert, edit-pattern) they must bring their own dark band, or
    // dark-themed content renders on white.
    for (const [name] of HOMEPAGE_PATTERNS) {
      const root = upcast(parse(getPattern(name)!.content)).blocks[0];
      expect(root.classes, name).toMatch(/\bbg-/);
    }
  });

  test("the seven patterns' census matches the fixture's SECTION content", () => {
    // Sum each pattern's census. The page-shell wrappers (the bg-gray-900 div
    // + <main>) are NOT sections, so 44 groups = the fixture's 46 minus those
    // two; everything else lives inside a section and is unchanged.
    const total: Record<string, number> = {};
    for (const [name] of HOMEPAGE_PATTERNS) {
      census(upcast(parse(getPattern(name)!.content)).blocks, total);
    }
    expect(total.group).toBe(44); // 46 fixture groups − 2 page-shell wrappers
    expect(total.paragraph).toBe(27);
    expect(total.button).toBe(13);
    expect(total.icon).toBe(10);
    expect(total.heading).toBe(9);
    expect(total.image).toBe(8);
    expect(total["raw-html"]).toBe(5); // the decorative SVGs (now allowed in patterns)
  });
});
