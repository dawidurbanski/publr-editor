import { page } from "@vitest/browser/context";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { attachInlineChrome, createEditor } from "../src/index";
import type { Editor } from "../src/index";
import { registerCoreBlocks } from "../src/blocks";

beforeAll(() => registerCoreBlocks());

describe("toolbar visual parity", () => {
  let host!: HTMLElement;
  let canvas!: HTMLElement;
  let editor!: Editor;
  let detach!: () => void;

  afterEach(() => {
    detach?.();
    editor?.destroy();
    host?.remove();
  });

  test("text, layout, media, and complex descriptors stay visually stable", async () => {
    host = document.createElement("div");
    host.style.cssText =
      "position:relative;width:960px;min-height:720px;padding:96px 40px;background:#f6f7f7";
    canvas = document.createElement("main");
    host.appendChild(canvas);
    document.body.appendChild(host);
    editor = createEditor({ canvas, defaultBlock: "paragraph", groupBlock: "group" });
    editor.loadHtml(
      `<h2 data-pb-block="heading" data-pb-id="heading" data-pb-tag="level" data-pb-rich="text">Deploy with confidence</h2>` +
        `<div data-pb-block="row" data-pb-id="row" data-pb-tag="tag" data-pb-children><p data-pb-block="paragraph" data-pb-rich="body">One</p><p data-pb-block="paragraph" data-pb-rich="body">Two</p></div>` +
        `<figure data-pb-block="image" data-pb-id="image"><img data-pb-image="image" src="/sample.jpg" alt="Sample"><figcaption data-pb-rich="caption">Caption</figcaption></figure>` +
        `<div data-pb-block="accordion" data-pb-id="accordion" data-pb-children><details data-pb-block="accordion-item"><summary data-pb-rich="title">Question</summary><div data-pb-children></div></details></div>`,
    );
    detach = attachInlineChrome(editor, { container: host });

    const toolbar = host.querySelector<HTMLElement>(".pbe-toolbar")!;
    for (const [id, snapshot] of [
      ["heading", "toolbar-text"],
      ["row", "toolbar-layout"],
      ["image", "toolbar-media"],
      ["accordion", "toolbar-complex"],
    ] as const) {
      editor.selectBlock(id);
      await vi.waitFor(() => expect(toolbar.hidden).toBe(false));
      await expect.element(page.elementLocator(toolbar)).toMatchScreenshot(snapshot, {
        comparatorOptions: { allowedMismatchedPixelRatio: 0.01 },
      });
    }

    host.style.width = "360px";
    editor.selectBlock("image");
    await vi.waitFor(() => expect(toolbar.hidden).toBe(false));
    await expect.element(page.elementLocator(toolbar)).toMatchScreenshot("toolbar-media-narrow", {
      comparatorOptions: { allowedMismatchedPixelRatio: 0.01 },
    });
  });

  test("the live demo inspector stays stable at desktop and narrow widths", async () => {
    let frame: HTMLIFrameElement | null = null;
    const loadDemo = async (width: number) => {
      const next = document.createElement("iframe");
      next.width = String(width);
      next.height = "760";
      next.style.cssText = "display:block;border:0";
      document.body.appendChild(next);
      const loaded = new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("demo iframe timed out")), 10_000);
        next.addEventListener("load", () => {
          window.clearTimeout(timer);
          resolve();
        });
      });
      next.src = `/index.html?visual-inspector=${width}`;
      await loaded;
      const doc = next.contentDocument!;
      const frameEvent = (name: string) => {
        const event = doc.createEvent("Event");
        event.initEvent(name, true, false);
        return event;
      };
      await vi.waitFor(() => expect(doc.querySelector("#canvas [data-pb-id]")).toBeTruthy(), {
        timeout: 10_000,
      });
      const heading = doc.querySelector<HTMLElement>('[data-pb-block="heading"]')!;
      heading.focus();
      const range = doc.createRange();
      range.selectNodeContents(heading);
      range.collapse(false);
      const selection = next.contentWindow!.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      doc.dispatchEvent(new Event("selectionchange"));
      await vi.waitFor(() =>
        expect(doc.querySelector("#block-card-title")?.textContent).toBe("Heading"),
      );
      const stylesTab = doc.querySelector<HTMLButtonElement>('[data-itab="styles"]')!;
      stylesTab.click();
      await vi.waitFor(() => {
        expect(stylesTab.getAttribute("aria-selected")).toBe("true");
        expect(doc.querySelector(".pbe-box-model")).toBeTruthy();
      });

      const marginTop = doc.querySelector<HTMLButtonElement>(
        '.pbe-box-model__value[data-kind="margin"][data-side="Top"]',
      )!;
      const currentHeading = () => doc.querySelector<HTMLElement>('[data-pb-block="heading"]')!;
      marginTop.click();
      await vi.waitFor(() =>
        expect(
          doc
            .querySelector<HTMLButtonElement>(
              '.pbe-box-model__value[data-kind="margin"][data-side="Top"]',
            )!
            .getAttribute("aria-pressed"),
        ).toBe("true"),
      );
      const beforeSpacing = currentHeading().outerHTML;
      const boxScale = doc.querySelector<HTMLInputElement>(
        '.pbe-box-model__control input[type="range"]',
      )!;
      boxScale.focus();
      boxScale.value = "4";
      boxScale.dispatchEvent(frameEvent("change"));
      await vi.waitFor(() => expect(currentHeading().outerHTML).not.toBe(beforeSpacing));
      const appliedSpacing = currentHeading().outerHTML;
      const arbitraryInput = doc.querySelector<HTMLInputElement>(
        ".pbe-box-model__control .pbe-scale__editor",
      )!;
      arbitraryInput.focus();
      arbitraryInput.value = "18px";
      arbitraryInput.dispatchEvent(frameEvent("change"));
      await vi.waitFor(() => expect(currentHeading().outerHTML).not.toBe(appliedSpacing));
      const arbitraryMargin = currentHeading().outerHTML;
      const resetArbitrary = doc.querySelector<HTMLInputElement>(
        ".pbe-box-model__control .pbe-scale__editor",
      )!;
      expect(resetArbitrary.value).toBe("18px");
      resetArbitrary.focus();
      resetArbitrary.value = "";
      resetArbitrary.dispatchEvent(frameEvent("change"));
      await vi.waitFor(() => expect(currentHeading().outerHTML).not.toBe(arbitraryMargin));

      const lineHeight = doc.querySelector<HTMLInputElement>(
        '.pbe-scale__input[data-prop="lineHeight"]',
      )!;
      const beforeScale = currentHeading().outerHTML;
      lineHeight.focus();
      lineHeight.value = "2";
      lineHeight.dispatchEvent(frameEvent("change"));
      await vi.waitFor(() => expect(currentHeading().outerHTML).not.toBe(beforeScale));
      const appliedScale = currentHeading().outerHTML;
      const updatedLineHeight = doc.querySelector<HTMLInputElement>(
        '.pbe-scale__input[data-prop="lineHeight"]',
      )!;
      updatedLineHeight.focus();
      updatedLineHeight.value = "0";
      updatedLineHeight.dispatchEvent(frameEvent("change"));
      await vi.waitFor(() => expect(currentHeading().outerHTML).not.toBe(appliedScale));

      const liveHeading = currentHeading();
      liveHeading.focus();
      const liveRange = doc.createRange();
      liveRange.selectNodeContents(liveHeading);
      liveRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(liveRange);
      doc.dispatchEvent(frameEvent("selectionchange"));
      await vi.waitFor(() =>
        expect(doc.querySelector("#block-card-title")?.textContent).toBe("Heading"),
      );
      doc.querySelector<HTMLButtonElement>('[data-itab="styles"]')!.click();
      const boxModel = doc.querySelector<HTMLElement>(".pbe-box-model")!;
      expect(boxModel).toBeTruthy();
      await vi.waitFor(() =>
        expect(doc.querySelector<HTMLElement>("#block-styles")!.offsetParent).toBeTruthy(),
      );
      expect(doc.querySelector<HTMLElement>("#block-dimensions")!.offsetParent).toBeTruthy();
      expect(boxModel.offsetParent).toBeTruthy();
      expect(doc.querySelector('.pbe-scale__input[data-prop="lineHeight"]')).toBeTruthy();
      const sidebar = doc.querySelector<HTMLElement>("#sidebar")!;
      sidebar.scrollTop = 0;
      await new Promise<void>((resolve) =>
        next.contentWindow!.requestAnimationFrame(() => resolve()),
      );
      sidebar.scrollTop =
        boxModel.getBoundingClientRect().top - sidebar.getBoundingClientRect().top - 72;
      await new Promise<void>((resolve) =>
        next.contentWindow!.requestAnimationFrame(() => resolve()),
      );
      return next;
    };
    try {
      await page.viewport(1400, 900);
      frame = await loadDemo(1180);
      await expect.element(page.elementLocator(frame)).toMatchScreenshot("inspector-desktop", {
        comparatorOptions: { allowedMismatchedPixelRatio: 0.01 },
      });

      frame.remove();
      await page.viewport(600, 900);
      frame = await loadDemo(430);
      await expect.element(page.elementLocator(frame)).toMatchScreenshot("inspector-narrow", {
        comparatorOptions: { allowedMismatchedPixelRatio: 0.01 },
      });
    } finally {
      frame?.remove();
    }
  });
});
