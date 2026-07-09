// The POC stress fixture (Tailwind Plus dark homepage) loaded into THIS
// editor — the real-world verification of the lens/carrier architecture:
// permissive upcast at scale, pasted-Tailwind lens reads, replace-not-shadow
// writes, the round-trip law over 100+ nested blocks, and an unresolved-
// utility sweep against the full default theme (a chip here is either a real
// template/theme gap or a shape-detector false positive to fix).
//
// The fixture is the SAME markdown the manual harness loads
// (/?fixture=features/poc-homepage) — one copy, no drift.

import { beforeAll, describe, expect, test } from "vitest";
import {
  DEFAULT_THEME,
  collectClasses,
  createEditor,
  downcast,
  httpCssEngine,
  inlineBackend,
  setActiveTheme,
  unresolvedUtilities,
  upcast,
} from "../src/index";
import type { Block, Model } from "../src/index";
import { registerCoreBlocks } from "../src/blocks";
import md from "./manual/features/poc-homepage.md?raw";

const fence = /^```html\r?\n([\s\S]*?)^```/m.exec(md);
const HTML = fence?.[1] ?? "";

function parse(html: string): Element {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.querySelector("[data-pb-doc]") ?? tmp;
}

function census(blocks: Block[], counts: Record<string, number> = {}): Record<string, number> {
  for (const b of blocks) {
    counts[b.type] = (counts[b.type] ?? 0) + 1;
    if (b.children) census(b.children, counts);
  }
  return counts;
}

describe("POC homepage stress fixture (real-world Tailwind)", () => {
  let model: Model;
  beforeAll(() => {
    registerCoreBlocks();
    setActiveTheme(DEFAULT_THEME);
    model = upcast(parse(HTML));
  });

  test("everything types: 113 typed blocks, exactly 5 raw-html SVG passthroughs", () => {
    const counts = census(model.blocks);
    expect(counts["raw-html"]).toBe(5); // the decorative SVG art, lossless
    const typed = Object.entries(counts)
      .filter(([t]) => t !== "raw-html")
      .reduce((n, [, c]) => n + c, 0);
    expect(typed).toBe(113);
    expect(counts.group).toBe(46); // every POC section became a container
    expect(counts.paragraph).toBe(27);
    expect(counts.button).toBe(13);
    expect(counts.icon).toBe(10);
    expect(counts.heading).toBe(9);
    expect(counts.image).toBe(8);
  });

  test("the round-trip law holds over the whole page", () => {
    expect(upcast(parse(downcast(model)))).toEqual(model);
  });

  test("no template class is unresolved against the full default theme", () => {
    const classes = collectClasses(downcast(model));
    expect(classes.length).toBeGreaterThan(150); // the real utility universe
    expect(unresolvedUtilities(classes, DEFAULT_THEME).map((u) => u.cls)).toEqual([]);
  });

  test("end-to-end fidelity: engine CSS APPLIES to the canvas (blur, z-index, scale)", async () => {
    // The vitest browser page runs off the same vite server, so the jit
    // bridge answers here too. Skip silently when the jit isn't built.
    try {
      if (!(await fetch("/__jit", { method: "POST", body: "p-1" })).ok) return;
    } catch {
      return;
    }
    const canvas = document.createElement("main");
    canvas.id = "canvas";
    document.body.appendChild(canvas);
    const editor = createEditor({ canvas, defaultBlock: "paragraph", theme: DEFAULT_THEME });
    const tag = document.createElement("style");
    try {
      editor.loadHtml(HTML);
      const classes = collectClasses(editor.serialize());
      // raw-html decoration classes reach the compile input too
      for (const c of ["blur-3xl", "-z-10", "opacity-20", "transform-gpu"])
        expect(classes).toContain(c);
      const { css } = await httpCssEngine("/__jit").compile(classes);
      tag.textContent = css;
      document.head.appendChild(tag);
      // The hero blob: absolutely positioned, blurred glow BEHIND the content
      // (a negative-z, out-of-flow layer) — NOT a solid shape sitting in flow.
      const blob = canvas.querySelector('[class*="blur-3xl"]')!;
      expect(blob).toBeTruthy();
      const blobStyle = getComputedStyle(blob);
      expect(blobStyle.position).toBe("absolute"); // out of flow
      expect(blobStyle.filter).toContain("blur(");
      expect(blobStyle.zIndex).toBe("-10"); // behind content
      // The hero H1's template scale must land (text-5xl, sm:text-7xl by viewport).
      const h1 = canvas.querySelector("h1")!;
      expect(["48px", "72px"]).toContain(getComputedStyle(h1).fontSize);
      // The logo-cloud images render at their authored height (h-11 = 44px),
      // not overflowing — the classTarget fix, verified as computed layout.
      const logo = [...canvas.querySelectorAll("figure img")].find((i) =>
        i.className.includes("h-11"),
      ) as HTMLElement | undefined;
      if (logo) expect(getComputedStyle(logo).height).toBe("44px");
    } finally {
      tag.remove();
      editor.destroy();
      canvas.remove();
    }
  });

  test("a fully-authored button keeps its authored padding/radius (no peer-utility preset)", async () => {
    try {
      if (!(await fetch("/__jit", { method: "POST", body: "p-1" })).ok) return;
    } catch {
      return;
    }
    const canvas = document.createElement("main");
    canvas.id = "canvas";
    document.body.appendChild(canvas);
    // styles.css ships the .pbe-btn--* defaults (components layer); load it so
    // the cascade under test matches the demo exactly.
    await import("../src/styles.css");
    const editor = createEditor({ canvas, defaultBlock: "paragraph", theme: DEFAULT_THEME });
    const tag = document.createElement("style");
    try {
      // A Tailwind-Plus-style CTA: authored look, no style island → "solid".
      editor.loadHtml(
        `<a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="#" class="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white">Get started</a>`,
      );
      tag.textContent = (
        await httpCssEngine("/__jit").compile(collectClasses(editor.serialize()))
      ).css;
      document.head.appendChild(tag);
      const a = canvas.querySelector("a")!;
      const cs = getComputedStyle(a);
      // px-3.5 = 14px (authored), NOT the preset's px-4 = 16px.
      expect(cs.paddingLeft).toBe("14px");
      // py-2.5 = 10px (authored), NOT the preset's py-2 = 8px.
      expect(cs.paddingTop).toBe("10px");
    } finally {
      tag.remove();
      editor.destroy();
      canvas.remove();
    }
  });

  test("a self-contained preview doc carries reset + compiled utilities + theme root", async () => {
    try {
      if (!(await fetch("/__jit", { method: "POST", body: "p-1" })).ok) return;
    } catch {
      return;
    }
    // The composition the demo's preview() action performs: the published HTML
    // + engine CSS (preflight prepended) + the theme :root, all inlined.
    const canvas = document.createElement("main");
    document.body.appendChild(canvas);
    const editor = createEditor({ canvas, defaultBlock: "paragraph", theme: DEFAULT_THEME });
    try {
      editor.loadHtml(HTML);
      const published = editor.serialize({ pipeline: "data" });
      const { css } = await httpCssEngine("/__jit?preflight=1").compile(collectClasses(published));
      const themeRoot = inlineBackend.css!(DEFAULT_THEME);
      const doc = `<style>${css}\n${themeRoot}</style>${published}`;

      // Reset: preflight zeroes block margins (the margin-0 default, shipped).
      expect(css).toMatch(/\bmargin:\s*0\b/);
      // The real utility universe compiled in — layout, color, the hero blob.
      for (const rule of [".bg-gray-900", ".text-5xl", ".blur-3xl", ".-z-10"])
        expect(css).toContain(rule);
      // Theme tokens the utilities reference resolve from :root.
      expect(doc).toContain(":root");
      expect(doc).toContain("--color-indigo-500:");
      // Actually rendering it applies (mount the whole doc, check the hero blob).
      const host = document.createElement("div");
      host.innerHTML = doc;
      document.body.appendChild(host);
      try {
        const blob = host.querySelector('[class*="blur-3xl"]')!;
        expect(getComputedStyle(blob).zIndex).toBe("-10");
      } finally {
        host.remove();
      }
    } finally {
      editor.destroy();
      canvas.remove();
    }
  });

  test("blocks are margin-0 by default: only authored margins apply (no phantom 1em)", async () => {
    try {
      if (!(await fetch("/__jit", { method: "POST", body: "p-1" })).ok) return;
    } catch {
      return;
    }
    const canvas = document.createElement("main");
    canvas.id = "canvas";
    document.body.appendChild(canvas);
    await import("../src/styles.css"); // the demo's canvas cascade (preflight + our base layer)
    const editor = createEditor({ canvas, defaultBlock: "paragraph", theme: DEFAULT_THEME });
    const tag = document.createElement("style");
    try {
      editor.loadHtml(
        `<div data-pb-doc><p data-pb-block="paragraph" data-pb-rich="body" class="mt-8">Spaced only by its authored class.</p><p data-pb-block="paragraph" data-pb-rich="body">Bare — no margin at all.</p></div>`,
      );
      tag.textContent = (
        await httpCssEngine("/__jit").compile(collectClasses(editor.serialize()))
      ).css;
      document.head.appendChild(tag);
      const [spaced, bare] = [...canvas.querySelectorAll("p")];
      expect(getComputedStyle(spaced).marginTop).toBe("32px"); // mt-8, authored
      expect(getComputedStyle(spaced).marginBottom).toBe("0px"); // NO phantom 1em bottom
      expect(getComputedStyle(bare).marginTop).toBe("0px"); // bare = zero, matches production
      expect(getComputedStyle(bare).marginBottom).toBe("0px");
    } finally {
      tag.remove();
      editor.destroy();
      canvas.remove();
    }
  });

  test("an icon's authored `flex` is not fought by a baseline `inline-block`", () => {
    // The badge bug: the icon render forced `inline-block`, a PEER of the
    // authored `flex`; the engine's cascade order let inline-block win and the
    // svg never centered. The render now emits no display utility.
    const m = upcast(
      parse(
        `<div data-pb-doc><span data-pb-block="icon" data-pb-rich="svg" class="mb-6 flex size-10 items-center justify-center rounded-lg bg-indigo-500"><svg viewBox="0 0 24 24"><path d="M0 0h24v24z"/></svg></span></div>`,
      ),
    );
    const icon = m.blocks[0];
    expect(icon.type).toBe("icon");
    expect(icon.classes).toBe(
      "mb-6 flex size-10 items-center justify-center rounded-lg bg-indigo-500",
    );
    const html = downcast(m);
    expect(html).not.toContain("inline-block"); // no peer display utility to conflict
    expect(html).toContain("flex"); // the authored display is the only one
    expect(upcast(parse(html))).toEqual(m); // round-trips
  });

  test("a bare <img class=h-11> sizes the IMG, not the wrapping figure", () => {
    // The logo-cloud bug: h-11 landed on the <figure> while the <img> stayed
    // unconstrained and overflowed. classTarget="img" routes it to the img.
    const m = upcast(
      parse(
        `<div data-pb-doc><img data-pb-block="image" data-pb-image="image" src="/mark.svg" alt="Co" class="h-11"></div>`,
      ),
    );
    const img = m.blocks[0];
    expect(img.type).toBe("image");
    expect(img.classes).toBe("h-11"); // authored, off the img (not the figure)
    const html = downcast(m);
    const fig = document.createElement("div");
    fig.innerHTML = html;
    const imgEl = fig.querySelector("img")!;
    const figEl = fig.querySelector("figure")!;
    expect(imgEl.className).toContain("h-11"); // sizing rides the IMG
    expect(imgEl.className).not.toContain("h-auto"); // no baseline height to fight it
    expect(figEl.className).not.toContain("h-11"); // NOT on the figure
    expect(upcast(parse(html))).toEqual(m); // and it round-trips
  });

  test("pasted template classes register in lenses and are REPLACED on edit", () => {
    const canvas = document.createElement("main");
    document.body.appendChild(canvas);
    const editor = createEditor({ canvas, defaultBlock: "paragraph", theme: DEFAULT_THEME });
    try {
      editor.loadHtml(HTML);
      // The hero H1 carries text-5xl straight from Tailwind Plus.
      const h1 = editor
        .getModel()
        .blocks.flatMap(function all(b: Block): Block[] {
          return [b, ...(b.children ?? []).flatMap(all)];
        })
        .find((b) => b.type === "heading" && b.classes?.includes("text-5xl"))!;
      expect(h1).toBeDefined();
      expect(editor.getStyle(h1.id, "fontSize")).toBe("5xl"); // lens reads the pasted class
      editor.setStyle(h1.id, "fontSize", "7xl");
      const classes = editor.getBlock(h1.id)!.classes!;
      expect(classes).toContain("text-7xl");
      expect(classes).not.toMatch(/(^| )text-5xl( |$)/); // replaced, never shadowed
      expect(classes).toContain("sm:text-7xl"); // the variant stays untouched (v0 rule)
    } finally {
      editor.destroy();
      canvas.remove();
    }
  });
});
