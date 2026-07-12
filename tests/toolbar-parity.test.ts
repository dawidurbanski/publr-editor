import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { attachInlineChrome, createEditor, flattenBlocks } from "../src/index";
import type { Editor } from "../src/index";
import { registerCoreBlocks, registerCorePatterns } from "../src/blocks";

beforeAll(() => {
  registerCoreBlocks();
  registerCorePatterns();
});

describe("declared contextual toolbars", () => {
  let host!: HTMLElement;
  let canvas!: HTMLElement;
  let editor!: Editor;
  let detach!: () => void;

  function setup(html: string, onEditPattern?: (name: string, id: string) => void) {
    host = document.createElement("div");
    canvas = document.createElement("main");
    host.appendChild(canvas);
    document.body.appendChild(host);
    editor = createEditor({ canvas, defaultBlock: "paragraph", groupBlock: "group" });
    editor.loadHtml(html);
    detach = attachInlineChrome(editor, { container: host, onEditPattern });
  }

  afterEach(() => {
    detach?.();
    editor?.destroy();
    host?.remove();
    window.getSelection()?.removeAllRanges();
  });

  const toolbar = () => host.querySelector<HTMLElement>(".pbe-toolbar")!;
  const control = (label: string) =>
    toolbar().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const controlRects = (label: string) => control(label)?.getClientRects().length ?? 0;

  test("rich text gets inline formats, while alignment is opt-in", async () => {
    setup(
      `<p data-pb-block="paragraph" data-pb-id="p" data-pb-rich="body">Text</p>` +
        `<pre data-pb-block="code" data-pb-id="c" data-pb-text="code">const x = 1;</pre>`,
    );

    editor.selectBlock("p");
    await vi.waitFor(() => expect(toolbar().hidden).toBe(false));
    expect(control("Align text").getClientRects().length).toBeGreaterThan(0);
    expect(control("Bold").getClientRects().length).toBeGreaterThan(0);

    editor.selectBlock("c");
    await vi.waitFor(() => expect(controlRects("Align text")).toBe(0));
    expect(control("Bold").getClientRects().length).toBe(0);
  });

  test("heading level is a bound toolbar choice", async () => {
    setup(
      `<h2 data-pb-block="heading" data-pb-id="h" data-pb-tag="level" data-pb-rich="text">Title</h2>`,
    );
    editor.selectBlock("h");
    await vi.waitFor(() => expect(control("Change heading level")).toBeTruthy());

    control("Change heading level").click();
    const panel = host.querySelector<HTMLElement>(".pbe-toolbar-options")!;
    expect(panel.contains(document.activeElement)).toBe(true);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect((document.activeElement as HTMLButtonElement).textContent).toBe("H2");
    const h3 = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "H3",
    )!;
    h3.click();
    expect(editor.getBlock("h")?.fields.level).toBe("h3");
    expect(control("Bold").getClientRects().length).toBeGreaterThan(0);
  });

  test("style-bound controls use grouped descriptors and the style backend", async () => {
    setup(
      `<div data-pb-block="row" data-pb-id="r" data-pb-tag="tag" data-pb-children>` +
        `<p data-pb-block="paragraph" data-pb-rich="body">Child</p></div>`,
    );
    editor.selectBlock("r");
    await vi.waitFor(() => expect(control("Change justification")).toBeTruthy());
    expect(
      control("Change justification")
        .closest("[data-toolbar-group]")
        ?.getAttribute("data-toolbar-group"),
    ).toBe("block");
    control("Change justification").click();
    let panel = host.querySelector<HTMLElement>(".pbe-toolbar-options")!;
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(control("Change justification"));
    control("Change justification").click();
    panel = host.querySelector<HTMLElement>(".pbe-toolbar-options")!;
    const center = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Center",
    )!;
    center.click();
    expect(editor.getStyle("r", "justifyContent")).toBe("center");
    editor.undo();
    expect(editor.getStyle("r", "justifyContent")).toBe("");
  });

  test("the options menu duplicates and removes through editor history", async () => {
    setup(`<p data-pb-block="paragraph" data-pb-id="p" data-pb-rich="body">Text</p>`);
    editor.selectBlock("p");
    await vi.waitFor(() => expect(control("Options")).toBeTruthy());

    control("Options").click();
    const menu = host.querySelector<HTMLElement>(".pbe-more")!;
    const duplicate = [...menu.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Duplicate",
    )!;
    duplicate.click();
    expect(editor.getModel().blocks).toHaveLength(2);
    expect(editor.getModel().blocks[1].fields.body).toBe("Text");
    expect(editor.getModel().blocks[1].id).not.toBe("p");

    const copiedId = editor.getModel().blocks[1].id;
    expect(editor.removeBlock(copiedId)).toBe(true);
    expect(editor.getModel().blocks).toHaveLength(1);
    editor.undo();
    expect(editor.getModel().blocks).toHaveLength(2);
  });

  test("alignment, text, and options popovers return focus on Escape", async () => {
    setup(
      `<p data-pb-block="paragraph" data-pb-id="p" data-pb-rich="body">Text</p>` +
        `<span data-pb-block="icon" data-pb-id="i" data-pb-rich="svg"><svg></svg></span>`,
    );
    editor.selectBlock("p");
    await vi.waitFor(() => expect(control("Align text")).toBeTruthy());
    const align = control("Align text");
    align.click();
    host
      .querySelector<HTMLElement>(".pbe-align")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(align);

    const options = control("Options");
    options.click();
    host
      .querySelector<HTMLElement>(".pbe-more")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(options);

    options.blur();
    editor.selectBlock("i");
    await vi.waitFor(() => expect(control("Accessible label")).toBeTruthy());
    const label = control("Accessible label");
    label.click();
    const dialog = host.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Accessible label"]',
    )!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.activeElement).toBe(label);
  });

  test("resetStyles clears supported values atomically", () => {
    setup(`<p data-pb-block="paragraph" data-pb-id="p" data-pb-rich="body">Text</p>`);
    editor.setStyle("p", "fontSize", "lg");
    editor.setStyle("p", "padding", "4");

    expect(editor.resetStyles("p")).toBe(true);
    expect(editor.getStyle("p", "fontSize")).toBe("");
    expect(editor.getStyle("p", "padding")).toBe("");
    editor.undo();
    expect(editor.getStyle("p", "fontSize")).toBe("lg");
    expect(editor.getStyle("p", "padding")).toBe("4");
  });

  test("settings sections reset only their declared role", () => {
    setup(`<p data-pb-block="paragraph" data-pb-id="p" data-pb-rich="body">Text</p>`);
    editor.setSetting("p", "dropCap", true);
    editor.setSetting("p", "direction", "rtl");
    expect(editor.resetSettings("p", "design")).toBe(true);
    expect(editor.getBlock("p")?.settings).toEqual({ direction: "rtl" });
    editor.undo();
    expect(editor.getBlock("p")?.settings).toEqual({ dropCap: true, direction: "rtl" });
  });

  test("container toolbars append declared child types", async () => {
    setup(
      `<figure data-pb-block="gallery" data-pb-id="g"><div data-pb-children></div>` +
        `<figcaption data-pb-rich="caption"></figcaption></figure>`,
    );
    editor.selectBlock("g");
    await vi.waitFor(() => expect(control("Add image").getClientRects().length).toBeGreaterThan(0));
    control("Add image").click();
    expect(editor.getBlock("g")?.children).toHaveLength(1);
    expect(editor.getBlock("g")?.children?.[0].type).toBe("image");
    editor.undo();
    expect(editor.getBlock("g")?.children).toHaveLength(0);
  });

  test("the spacer resize handle commits one undoable custom height", async () => {
    setup(`<div data-pb-block="spacer" data-pb-id="s" aria-hidden="true"></div>`);
    editor.selectBlock("s");
    const handle = host.querySelector<HTMLButtonElement>(".pbe-spacer-handle")!;
    await vi.waitFor(() => expect(handle.hidden).toBe(false));
    handle.setPointerCapture = () => undefined;
    const startHeight = canvas
      .querySelector<HTMLElement>('[data-pb-id="s"]')!
      .getBoundingClientRect().height;
    handle.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientY: 100 }),
    );
    handle.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientY: 140 }),
    );
    handle.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientY: 140 }),
    );
    expect(editor.getStyle("s", "height")).toBe(`${Math.round(startHeight + 40)}px`);
    editor.undo();
    expect(editor.getStyle("s", "height")).toBe("");
  });

  test("a pattern converts to blocks instead of exposing Ungroup", async () => {
    setup(`<p data-pb-block="paragraph" data-pb-id="seed" data-pb-rich="body"></p>`);
    const [root] = editor.insertPattern("hero")!;
    const published = editor.serialize({ pipeline: "data" });

    expect(editor.ungroupTarget(root.id)).toBeNull();
    expect(editor.ungroupBlock(root.id)).toBe(false);
    editor.selectBlock(root.id);
    await vi.waitFor(() => expect(control("Options").getClientRects().length).toBeGreaterThan(0));
    control("Options").click();

    const menu = host.querySelector<HTMLElement>(".pbe-more")!;
    const byText = (text: string) =>
      [...menu.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent === text,
      )!;
    expect(byText("Ungroup").hidden).toBe(true);
    expect(byText("Convert to blocks").hidden).toBe(false);

    byText("Convert to blocks").click();
    expect(editor.getBlock(root.id)).toBeUndefined();
    expect(editor.serialize({ pipeline: "data" })).toBe(published);
    editor.undo();
    expect(editor.getBlock(root.id)?.pattern).toBe("hero");
  });

  test("legacy pattern provenance on a real group also replaces Ungroup", async () => {
    setup(
      `<div data-pb-block="group" data-pb-id="legacy" data-pb-pattern="hero" data-pb-tag="tag" data-pb-children>` +
        `<p data-pb-block="paragraph" data-pb-rich="body">Legacy content</p></div>`,
    );
    const published = editor.serialize({ pipeline: "data" });
    editor.selectBlock("legacy");
    await vi.waitFor(() => expect(control("Options").getClientRects().length).toBeGreaterThan(0));
    control("Options").click();

    const menu = host.querySelector<HTMLElement>(".pbe-more")!;
    const byText = (text: string) =>
      [...menu.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent === text,
      )!;
    expect(byText("Ungroup").hidden).toBe(true);
    expect(byText("Convert to blocks").hidden).toBe(false);

    byText("Convert to blocks").click();
    expect(editor.getBlock("legacy")?.type).toBe("group");
    expect(editor.getBlock("legacy")?.pattern).toBeUndefined();
    expect(editor.serialize({ pipeline: "data" })).toBe(published);
    expect(editor.ungroupTarget("legacy")).toBe("legacy");
  });

  test("pattern descendants use the content-only toolbar variant", async () => {
    const seen: [string, string][] = [];
    setup(`<p data-pb-block="paragraph" data-pb-id="seed" data-pb-rich="body"></p>`, (name, id) =>
      seen.push([name, id]),
    );
    const [root] = editor.insertPattern("hero")!;
    const paragraph = flattenBlocks(root.children ?? []).find(
      (block) => block.type === "paragraph",
    )!;

    editor.selectBlock(paragraph.id);
    await vi.waitFor(() => expect(toolbar().hidden).toBe(false));
    expect(editor.editingMode(paragraph.id)).toBe("content-only");
    expect(editor.canDuplicate(paragraph.id)).toBe(false);
    expect(editor.canRemove(paragraph.id)).toBe(false);
    expect(control("Move up").getClientRects().length).toBe(0);
    expect(controlRects("Align text")).toBe(0);
    expect(control("Bold").getClientRects().length).toBeGreaterThan(0);

    const edit = [...toolbar().querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Edit pattern",
    )!;
    expect(edit.closest<HTMLElement>("div")!.hidden).toBe(true);
    expect(seen).toEqual([]);

    editor.selectBlock(root.id);
    await vi.waitFor(() => expect(edit.closest<HTMLElement>("div")!.hidden).toBe(false));
    edit.click();
    expect(seen).toEqual([["hero", root.id]]);
  });
});
