// Image block — figure root, img with all four image-carrier attributes,
// always-present figcaption (Gutenberg core/image). The link wrapper is a
// SETTING, not a field: a field's carrier must always be emitted, but the
// <a> exists only when `href` is set — the render derives it (escaped) and
// upcast reads it from the island, never the anchor. Aspect ratio uses
// "/"-free tokens (square, 4-3, 16-9…). Legacy bare <img data-pb-block>
// roots still ingest permissively (carriers found on the root itself);
// downcast normalizes them to the figure form.
//
// Dropped GB attributes (core/image): blob/id/sizeSlug (media library),
// lightbox (interactivity runtime), title, rel/linkClass/linkDestination,
// focalPoint (lens/JIT territory), isDecorative (alt="" expresses it).

import { escAttr, str } from "../carriers";
import type { ImageValue } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

// ratio token → utility classes on the root, scoped to the img (inner
// derived classes regenerate every render; only ROOT classes join the
// authored-classes baseline)
const RATIO_CLASS: Record<string, string> = {
  square: "[&_img]:aspect-square [&_img]:w-full",
  "4-3": "[&_img]:aspect-[4/3] [&_img]:w-full",
  "3-2": "[&_img]:aspect-[3/2] [&_img]:w-full",
  "16-9": "[&_img]:aspect-video [&_img]:w-full",
};

export const type = "image";

export const definition: BlockDefinition = {
  label: "Image",
  category: "Media",
  icon: "image",
  placeholder: "Add caption",
  description: "Insert an image to make a visual statement.",
  // Authored classes size the IMG, not the caption <figure> that wraps it — a
  // pasted `<img class="h-11">` (real-world templates put sizing on the img)
  // must render as a 44px image, never a 44px figure with an overflowing img.
  classTarget: "img",
  settings: [
    { control: "media", label: "Image", field: "image" },
    { control: "text", label: "Link URL", setting: "href", default: "", placeholder: "https://…" },
    {
      control: "select",
      label: "Open in",
      setting: "linkTarget",
      default: "none",
      options: [
        { value: "none", label: "Same tab" },
        { value: "_blank", label: "New tab" },
      ],
    },
    {
      control: "select",
      label: "Aspect ratio",
      setting: "aspectRatio",
      default: "auto",
      options: [
        { value: "auto", label: "Original" },
        { value: "square", label: "Square (1:1)" },
        { value: "4-3", label: "Standard (4:3)" },
        { value: "3-2", label: "Classic (3:2)" },
        { value: "16-9", label: "Wide (16:9)" },
      ],
    },
    {
      control: "select",
      label: "Scale",
      setting: "scale",
      default: "cover",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
      ],
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const img = (fields.image ?? {}) as Partial<ImageValue>;
    const dims =
      (img.width ? ` width="${escAttr(img.width)}"` : "") +
      (img.height ? ` height="${escAttr(img.height)}"` : "");
    // `block max-w-full` = a responsive default; height is left UNSET (the
    // img's natural default) so an authored height utility (h-11, h-64…) on
    // the classTarget wins without fighting a baseline `h-auto`.
    const imgTag = `<img data-pb-image="image" src="${escAttr(img.src ?? "")}" alt="${escAttr(img.alt ?? "")}"${dims} class="block max-w-full">`;
    const href = typeof settings?.href === "string" ? settings.href.trim() : "";
    const target =
      href && settings?.linkTarget === "_blank" ? ` target="_blank" rel="noopener"` : "";
    const media = href ? `<a href="${escAttr(href)}"${target}>${imgTag}</a>` : imgTag;
    const ratio = RATIO_CLASS[String(settings?.aspectRatio)] ?? "";
    const scale = ratio
      ? settings?.scale === "contain"
        ? " [&_img]:object-contain"
        : " [&_img]:object-cover"
      : "";
    return `<figure data-pb-block="image"${ratio ? ` class="${ratio}${scale}"` : ""}>${media}<figcaption data-pb-rich="caption" class="mt-1.5 text-center text-sm text-neutral-500">${str(fields.caption)}</figcaption></figure>`;
  },
};
