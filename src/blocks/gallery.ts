// Gallery block — a grid of image blocks (Gutenberg core/gallery, v2 model:
// images are inner blocks, not a queried attribute array), plus a gallery
// caption. Columns/crop are island-canonical; the classes derived from them
// sit on the inner grid (whitelisted tokens, regenerated every render).
//
// Dropped GB attributes (core/gallery): images + ids (the deprecated v1
// attribute-array model — the slot IS the model), shortCodeTransforms,
// randomOrder, fixedHeight, linkTo/linkTarget (per-image concerns live on
// the image block), sizeSlug, allowResize, aspectRatio (crop covers v0).

import { str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const COL_CLASS: Record<string, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-2",
  "3": "grid-cols-3",
  "4": "grid-cols-4",
  "5": "grid-cols-5",
  "6": "grid-cols-6",
  "7": "grid-cols-7",
  "8": "grid-cols-8",
};

export const type = "gallery";

export const definition: BlockDefinition = {
  label: "Gallery",
  category: "Media",
  icon: "gallery",
  placeholder: "Add caption",
  description: "Display multiple images in a rich gallery.",
  allowedChildren: ["image"],
  childTemplate: ["image"],
  settings: [
    {
      control: "number",
      label: "Columns",
      setting: "columns",
      default: 3,
      min: 1,
      max: 8,
      step: 1,
    },
    { control: "toggle", label: "Crop images to fit", setting: "imageCrop", default: true },
  ],
  render(fields: Fields, settings?: Settings) {
    const cols = COL_CLASS[String(settings?.columns)] ?? "grid-cols-3";
    const crop =
      settings?.imageCrop === false
        ? ""
        : " [&_img]:aspect-square [&_img]:w-full [&_img]:object-cover";
    return `<figure data-pb-block="gallery"><div data-pb-children class="grid gap-3 ${cols}${crop}"></div><figcaption data-pb-rich="caption" class="mt-1.5 text-center text-sm text-neutral-500">${str(fields.caption)}</figcaption></figure>`;
  },
};
