// Cover block — hero container (Gutenberg core/cover): a background image,
// a dim overlay derived from `dimRatio`, and nested content blocks. The
// image is an always-present carrier (empty src when unset); the overlay
// span is pure derived presentation, regenerated every render from
// whitelisted tokens — never string-interpolated.
//
// `minHeight` is island-canonical but derives NOTHING in v0: the contract
// bans inline styles as derived output, so the value round-trips while the
// baseline pins min-height at the GB default (430px). Lens/JIT picks it up.
//
// Dropped GB attributes (core/cover): useFeaturedImage, id, the color/
// gradient system (lens/JIT territory), focalPoint, backgroundType + poster
// (image backgrounds only), minHeightUnit (px only), tagName, sizeSlug,
// templateLock. `isRepeated` (tiled background) is inexpressible on an
// <img> carrier — dropped rather than carried inert.

import { escAttr } from "../carriers";
import type { ImageValue } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const DIM_CLASS: Record<string, string> = {
  "0": "opacity-0",
  "10": "opacity-10",
  "20": "opacity-20",
  "30": "opacity-30",
  "40": "opacity-40",
  "50": "opacity-50",
  "60": "opacity-60",
  "70": "opacity-70",
  "80": "opacity-80",
  "90": "opacity-90",
  "100": "opacity-100",
};

// 9-way content position → flex utilities on the inner slot column
const POS_CLASS: Record<string, string> = {
  "top-left": "justify-start items-start text-left",
  "top-center": "justify-start items-center text-center",
  "top-right": "justify-start items-end text-right",
  "center-left": "justify-center items-start text-left",
  "center-center": "justify-center items-center text-center",
  "center-right": "justify-center items-end text-right",
  "bottom-left": "justify-end items-start text-left",
  "bottom-center": "justify-end items-center text-center",
  "bottom-right": "justify-end items-end text-right",
};

export const type = "cover";

export const definition: BlockDefinition = {
  label: "Cover",
  category: "Media",
  icon: "cover",
  description: "Add an image with a text overlay.",
  settings: [
    { control: "media", label: "Background image", field: "image" },
    {
      control: "number",
      label: "Overlay opacity",
      setting: "dimRatio",
      default: 50,
      min: 0,
      max: 100,
      step: 10,
    },
    { control: "number", label: "Minimum height (px)", setting: "minHeight", default: 430, min: 0 },
    {
      control: "select",
      label: "Content position",
      setting: "contentPosition",
      default: "center-center",
      options: Object.keys(POS_CLASS).map((value) => ({
        value,
        label: value.replace("-", " "),
      })),
    },
    {
      control: "toggle",
      label: "Fixed background (parallax)",
      setting: "hasParallax",
      default: false,
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const img = (fields.image ?? {}) as Partial<ImageValue>;
    const dims =
      (img.width ? ` width="${escAttr(img.width)}"` : "") +
      (img.height ? ` height="${escAttr(img.height)}"` : "");
    const dim = DIM_CLASS[String(settings?.dimRatio)] ?? "opacity-50";
    const pos = POS_CLASS[String(settings?.contentPosition)] ?? POS_CLASS["center-center"];
    // parallax: a fixed img clipped to the cover box (img-element equivalent
    // of background-attachment: fixed)
    const parallax = settings?.hasParallax === true;
    return (
      `<div data-pb-block="cover" class="relative isolate flex min-h-[430px] overflow-hidden p-4${parallax ? " [clip-path:inset(0)]" : ""}">` +
      `<img data-pb-image="image" src="${escAttr(img.src ?? "")}" alt="${escAttr(img.alt ?? "")}"${dims} class="${parallax ? "fixed" : "absolute"} inset-0 -z-20 h-full w-full object-cover">` +
      `<span class="absolute inset-0 -z-10 bg-black ${dim}" aria-hidden="true"></span>` +
      `<div data-pb-children class="relative flex flex-1 flex-col gap-3 text-white ${pos}"></div></div>`
    );
  },
};
