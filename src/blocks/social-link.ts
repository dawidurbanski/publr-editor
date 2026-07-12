// Social link — one icon link. The url is the
// link carrier on the anchor root; the SERVICE is island-canonical and
// derives the inline brand SVG + accessible name, regenerated every render
// (the svg is derived content, never a carrier). Icon bodies live in
// src/blocks/social-icons.ts (in-house generics + CC0 Simple Icons brand
// marks). Per-service url-prefix validation and label attribute are out of
// scope in v0.

import { escAttr } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";
import { SOCIAL_ICON_BODIES, SOCIAL_SERVICES } from "./social-icons";
import { LAYOUT_SUPPORTS } from "./supports";

const LABELS: Record<string, string> = {
  chain: "Link",
  mail: "Mail",
  feed: "RSS feed",
  github: "GitHub",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  tiktok: "TikTok",
};

export const type = "social-link";

export const definition: BlockDefinition = {
  label: "Social icon",
  category: "Widgets",
  icon: "share",
  internal: true,
  supports: LAYOUT_SUPPORTS,
  toolbar: [
    {
      control: "text",
      label: "Accessible label",
      setting: "ariaLabel",
      role: "content",
    },
    {
      control: "link",
      label: "Link",
      field: "url",
      targetSetting: "linkTarget",
      role: "content",
    },
    {
      control: "setting-options",
      label: "Change service",
      setting: "service",
      options: SOCIAL_SERVICES.map((service) => ({
        value: service,
        label: LABELS[service] ?? service,
      })),
      role: "content",
    },
    {
      control: "toggle-setting",
      label: "Show label",
      setting: "showLabel",
      role: "content",
    },
  ],
  settings: [
    {
      control: "select",
      label: "Service",
      setting: "service",
      default: "chain",
      role: "content",
      options: SOCIAL_SERVICES.map((s) => ({ value: s, label: LABELS[s] ?? s })),
    },
    {
      control: "text",
      label: "Profile URL",
      field: "url",
      placeholder: "https://…",
      role: "content",
    },
    {
      control: "toggle",
      label: "Show text label",
      setting: "showLabel",
      default: false,
      role: "content",
    },
    {
      control: "text",
      label: "Accessible label",
      setting: "ariaLabel",
      default: "",
      role: "content",
    },
    {
      control: "select",
      label: "Open in",
      setting: "linkTarget",
      default: "none",
      role: "content",
      options: [
        { value: "none", label: "Same tab" },
        { value: "_blank", label: "New tab" },
      ],
    },
    {
      control: "text",
      label: "Link rel",
      setting: "rel",
      default: "",
      role: "advanced",
      placeholder: "e.g. me nofollow",
    },
  ],
  render(fields: Fields, settings?: Settings) {
    const service = SOCIAL_ICON_BODIES[String(settings?.service)]
      ? String(settings?.service)
      : "chain";
    const url = typeof fields.url === "string" ? fields.url : "";
    const label =
      typeof settings?.ariaLabel === "string" && settings.ariaLabel.trim()
        ? settings.ariaLabel.trim()
        : (LABELS[service] ?? service);
    const rel = [
      settings?.linkTarget === "_blank" ? "noopener" : "",
      typeof settings?.rel === "string" ? settings.rel.trim() : "",
    ]
      .filter(Boolean)
      .join(" ");
    const attrs =
      (settings?.linkTarget === "_blank" ? ` target="_blank"` : "") +
      (rel ? ` rel="${escAttr(rel)}"` : "");
    const showLabel = settings?.showLabel === true ? " pbe-social-link--show-label" : "";
    return `<a data-pb-block="social-link" data-pb-link="url" href="${escAttr(url)}"${attrs} aria-label="${escAttr(label)}" class="inline-flex items-center gap-2 text-current${showLabel}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6 fill-current">${SOCIAL_ICON_BODIES[service]}</svg><span class="pbe-social-label">${escAttr(label)}</span></a>`;
  },
};
