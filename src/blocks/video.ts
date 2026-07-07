// Video block — reuses the `image` carrier (src/alt/width/height) on the
// <video> root — zero new carrier vocabulary; the alt="" it implies is
// non-standard on <video> but inert. Playback facts (controls, autoplay,
// loop, muted, playsInline, preload, poster) are island-canonical; the
// attributes on the root are derived presentation, regenerated every render.
//
// Dropped GB attributes (core/video): blob/id (media library), caption
// (bare video root in v0 — use a paragraph below), tracks (deferred).

import { escAttr } from "../carriers";
import type { ImageValue } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const PRELOAD = ["auto", "metadata", "none"];

export const type = "video";

export const definition: BlockDefinition = {
  label: "Video",
  category: "Media",
  icon: "video",
  description: "Embed a video from your media library or upload a new one.",
  settings: [
    { control: "media", label: "Video file", field: "video" },
    { control: "toggle", label: "Playback controls", setting: "controls", default: true },
    { control: "toggle", label: "Autoplay", setting: "autoplay", default: false },
    { control: "toggle", label: "Loop", setting: "loop", default: false },
    { control: "toggle", label: "Muted", setting: "muted", default: false },
    { control: "toggle", label: "Play inline", setting: "playsInline", default: false },
    {
      control: "select",
      label: "Preload",
      setting: "preload",
      default: "metadata",
      options: [
        { value: "auto", label: "Auto" },
        { value: "metadata", label: "Metadata" },
        { value: "none", label: "None" },
      ],
    },
    {
      control: "text",
      label: "Poster image URL",
      setting: "poster",
      default: "",
      placeholder: "https://…/poster.jpg",
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const v = (fields.video ?? {}) as Partial<ImageValue>;
    const dims =
      (v.width ? ` width="${escAttr(v.width)}"` : "") +
      (v.height ? ` height="${escAttr(v.height)}"` : "");
    let attrs = settings?.controls === false ? "" : " controls";
    if (settings?.autoplay === true) attrs += " autoplay";
    if (settings?.loop === true) attrs += " loop";
    if (settings?.muted === true) attrs += " muted";
    if (settings?.playsInline === true) attrs += " playsinline";
    const preload = String(settings?.preload);
    if (PRELOAD.includes(preload) && preload !== "metadata") attrs += ` preload="${preload}"`;
    const poster =
      typeof settings?.poster === "string" && settings.poster.trim()
        ? ` poster="${escAttr(settings.poster.trim())}"`
        : "";
    return `<video data-pb-block="video" data-pb-image="video" src="${escAttr(v.src ?? "")}" alt="${escAttr(v.alt ?? "")}"${dims}${attrs}${poster} class="block max-w-full"></video>`;
  },
};
