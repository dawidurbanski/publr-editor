// The media placeholder (chrome-inline, stories #365/#366): empty media
// blocks grow a GB-style card — Upload / Insert from URL / drag-drop. The
// card is canvas chrome: the serialized wire never contains it. Upload
// needs a controlling /media/* worker (absent under vitest — gated), so
// these tests cover presence, the URL flow, and wire cleanliness; the
// upload path is exercised end-to-end against the demo via Playwright.

import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { attachInlineChrome, createEditor } from "../src/index";
import type { Editor } from "../src/index";
import { registerCoreBlocks } from "../src/blocks";

beforeAll(() => registerCoreBlocks());

let host!: HTMLElement;
let canvas!: HTMLElement;
let editor!: Editor;
let detach!: () => void;

function setup(html: string) {
  host = document.createElement("div");
  canvas = document.createElement("main");
  host.appendChild(canvas);
  document.body.appendChild(host);
  editor = createEditor({ canvas, defaultBlock: "paragraph", groupBlock: "group" });
  editor.loadHtml(html);
  detach = attachInlineChrome(editor, { container: host });
  return editor;
}

afterEach(() => {
  detach?.();
  editor?.destroy();
  host?.remove();
});

const EMPTY_IMAGE = `<figure data-pb-block="image" data-pb-id="b_1"><img data-pb-image="image" src="" alt=""><figcaption data-pb-rich="caption"></figcaption></figure>`;

const card = () => canvas.querySelector<HTMLElement>(".pbe-media-ph");

describe("media placeholder", () => {
  test("an empty image block grows the card; a filled one never does", () => {
    setup(
      EMPTY_IMAGE +
        `<figure data-pb-block="image" data-pb-id="b_2"><img data-pb-image="image" src="/x.png" alt=""><figcaption data-pb-rich="caption"></figcaption></figure>`,
    );
    const cards = canvas.querySelectorAll(".pbe-media-ph");
    expect(cards).toHaveLength(1);
    expect(cards[0].closest("[data-pb-id]")!.getAttribute("data-pb-id")).toBe("b_1");
    expect(cards[0].textContent).toContain("Image");
    expect(cards[0].textContent).toContain("Insert from URL");
    // no /media/* worker controls a vitest page — Upload stays hidden
    expect(cards[0].querySelector<HTMLElement>(".pbe-mph-upload")!.hidden).toBe(true);
  });

  test("Insert from URL writes the field; the card leaves once media is set", async () => {
    setup(EMPTY_IMAGE);
    card()!.querySelector<HTMLButtonElement>(".pbe-mph-url-btn")!.click();
    const row = card()!.querySelector<HTMLFormElement>(".pbe-mph-url-row")!;
    expect(row.hidden).toBe(false);
    row.querySelector("input")!.value = "  https://pics.test/a.png ";
    row.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(editor.getBlock("b_1")!.fields.image).toEqual({
      src: "https://pics.test/a.png",
      alt: "",
      width: "",
      height: "",
    });
    await vi.waitFor(() => expect(card()).toBeNull()); // model change → re-render → re-sync
  });

  test("clearing the media brings the card back", async () => {
    setup(EMPTY_IMAGE);
    editor.setField("b_1", "image", { src: "/x.png", alt: "", width: "", height: "" });
    await vi.waitFor(() => expect(card()).toBeNull());
    editor.setField("b_1", "image", { src: "", alt: "", width: "", height: "" });
    await vi.waitFor(() => expect(card()).not.toBeNull());
  });

  test("the card is chrome only — the wire never carries it", () => {
    setup(EMPTY_IMAGE);
    expect(card()).not.toBeNull();
    expect(editor.serialize()).not.toContain("pbe-media-ph");
    expect(editor.serialize({ pipeline: "data" })).not.toContain("pbe-media-ph");
  });

  test("every media block type grows the card next to ITS empty carrier", () => {
    setup(
      `<figure data-pb-block="video" data-pb-id="b_v"><video data-pb-image="video" src="" alt=""></video><figcaption data-pb-rich="caption"></figcaption></figure>` +
        `<div data-pb-block="media-text" data-pb-id="b_m"><div><img data-pb-image="media" src="" alt=""></div><div data-pb-children><p data-pb-block="paragraph" data-pb-id="b_p" data-pb-rich="body">side</p></div></div>` +
        `<figure data-pb-block="embed" data-pb-id="b_e"><iframe data-pb-image="media" src=""></iframe><figcaption data-pb-rich="caption"></figcaption></figure>`,
    );
    expect(canvas.querySelectorAll(".pbe-media-ph")).toHaveLength(3);
    // the media-text card sits in the MEDIA column, not the grid root
    const mt = canvas.querySelector('[data-pb-id="b_m"] .pbe-media-ph')!;
    expect(mt.previousElementSibling!.tagName).toBe("IMG");
  });
});
