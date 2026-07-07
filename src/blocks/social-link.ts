// Social link — one icon link (Gutenberg core/social-link). The url is the
// link carrier on the anchor root; the SERVICE is island-canonical and
// derives the inline brand SVG + accessible name, regenerated every render
// (the svg is derived content, never a carrier). Icon paths extracted from
// the GB block library (src/blocks/social-icons.ts). GB's per-service
// url-prefix validation and label attribute are dropped in v0.

import { escAttr } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";
import { SOCIAL_ICON_PATHS, SOCIAL_SERVICES } from "./social-icons";

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
  settings: [
    {
      control: "select",
      label: "Service",
      setting: "service",
      default: "chain",
      options: SOCIAL_SERVICES.map((s) => ({ value: s, label: LABELS[s] ?? s })),
    },
    { control: "text", label: "Profile URL", field: "url", placeholder: "https://…" },
  ],
  render(fields: Fields, settings?: Settings) {
    const service = SOCIAL_ICON_PATHS[String(settings?.service)]
      ? String(settings?.service)
      : "chain";
    const url = typeof fields.url === "string" ? fields.url : "";
    return `<a data-pb-block="social-link" data-pb-link="url" href="${escAttr(url)}" aria-label="${escAttr(LABELS[service] ?? service)}" class="inline-flex text-current"><svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 fill-current"><path d="${escAttr(SOCIAL_ICON_PATHS[service])}"></path></svg></a>`;
  },
};
