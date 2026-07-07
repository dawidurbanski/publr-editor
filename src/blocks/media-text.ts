// Media & Text block — split layout (Gutenberg core/media-text): an image
// on one side, nested content blocks on the other. All layout facts are
// island-canonical; the derived classes are whitelisted tokens (mediaWidth
// maps to a fixed 5%-step class set — never interpolated).
//
// Dropped GB attributes (core/media-text): align (theme layout territory),
// mediaId/mediaSizeSlug/useFeaturedImage (media library / WP context),
// mediaType (image only in v0), mediaLink/linkDestination/linkTarget/href/
// rel/linkClass (link-around-media deferred), focalPoint (lens/JIT).

import { escAttr } from "../carriers";
import type { ImageValue } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

// mediaWidth token → the grid template, media column first (left) or last
// (right). Full literals so the utility scanner sees every token.
const WIDTH_LEFT: Record<string, string> = {
  "15": "grid-cols-[15%_1fr]",
  "20": "grid-cols-[20%_1fr]",
  "25": "grid-cols-[25%_1fr]",
  "30": "grid-cols-[30%_1fr]",
  "35": "grid-cols-[35%_1fr]",
  "40": "grid-cols-[40%_1fr]",
  "45": "grid-cols-[45%_1fr]",
  "50": "grid-cols-[50%_1fr]",
  "55": "grid-cols-[55%_1fr]",
  "60": "grid-cols-[60%_1fr]",
  "65": "grid-cols-[65%_1fr]",
  "70": "grid-cols-[70%_1fr]",
  "75": "grid-cols-[75%_1fr]",
  "80": "grid-cols-[80%_1fr]",
  "85": "grid-cols-[85%_1fr]",
};
const WIDTH_RIGHT: Record<string, string> = {
  "15": "grid-cols-[1fr_15%]",
  "20": "grid-cols-[1fr_20%]",
  "25": "grid-cols-[1fr_25%]",
  "30": "grid-cols-[1fr_30%]",
  "35": "grid-cols-[1fr_35%]",
  "40": "grid-cols-[1fr_40%]",
  "45": "grid-cols-[1fr_45%]",
  "50": "grid-cols-[1fr_50%]",
  "55": "grid-cols-[1fr_55%]",
  "60": "grid-cols-[1fr_60%]",
  "65": "grid-cols-[1fr_65%]",
  "70": "grid-cols-[1fr_70%]",
  "75": "grid-cols-[1fr_75%]",
  "80": "grid-cols-[1fr_80%]",
  "85": "grid-cols-[1fr_85%]",
};
const VALIGN_CLASS: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

export const type = "media-text";

export const definition: BlockDefinition = {
  label: "Media & Text",
  category: "Media",
  icon: "media-text",
  description: "Set media and words side-by-side for a richer layout.",
  settings: [
    { control: "media", label: "Media", field: "media" },
    {
      control: "toggle-group",
      label: "Media position",
      setting: "mediaPosition",
      default: "left",
      options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
    },
    {
      control: "number",
      label: "Media width (%)",
      setting: "mediaWidth",
      default: 50,
      min: 15,
      max: 85,
      step: 5,
    },
    { control: "toggle", label: "Stack on mobile", setting: "stackOnMobile", default: true },
    {
      control: "toggle-group",
      label: "Vertical alignment",
      setting: "verticalAlignment",
      default: "center",
      options: [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
      ],
    },
    { control: "toggle", label: "Image fills the column", setting: "imageFill", default: false },
  ],
  render(fields: Fields, settings?: Settings) {
    const m = (fields.media ?? {}) as Partial<ImageValue>;
    const dims =
      (m.width ? ` width="${escAttr(m.width)}"` : "") +
      (m.height ? ` height="${escAttr(m.height)}"` : "");
    const right = settings?.mediaPosition === "right";
    const width =
      (right ? WIDTH_RIGHT : WIDTH_LEFT)[String(settings?.mediaWidth)] ??
      (right ? WIDTH_RIGHT["50"] : WIDTH_LEFT["50"]);
    const valign = VALIGN_CLASS[String(settings?.verticalAlignment)] ?? "items-center";
    const stack = settings?.stackOnMobile === false ? "" : " max-md:grid-cols-1";
    const fill = settings?.imageFill === true ? " [&_img]:h-full [&_img]:object-cover" : "";
    return (
      `<div data-pb-block="media-text" class="grid gap-6 ${width} ${valign}${stack}">` +
      `<div class="min-w-0${right ? " order-2" : ""}${fill}"><img data-pb-image="media" src="${escAttr(m.src ?? "")}" alt="${escAttr(m.alt ?? "")}"${dims} class="block h-auto max-w-full"></div>` +
      `<div data-pb-children class="min-w-0"></div></div>`
    );
  },
};
