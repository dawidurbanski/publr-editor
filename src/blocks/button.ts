// Button block — anchor root with rich label + link url (multi-carrier
// root), style solid|outline|link (Gutenberg core/button). `link` is the
// chrome-free anchor look, fully styled by authored classes. linkTarget/
// rel/title are island-canonical; the attributes are derived (_blank
// always carries noopener, an authored rel merges in). GB's tagName
// a|button is not ported — the anchor root stays; the button element case
// is form-submit-button's job (widgets wave).

import { escAttr, str } from "../carriers";
import type { BlockDefinition, Fields, Settings } from "../registry";

const STYLE_CLASS: Record<string, string> = {
  solid:
    "inline-block rounded-sm bg-[var(--color-accent,#3858e9)] px-4 py-2 font-medium text-white no-underline",
  outline:
    "inline-block rounded-sm border border-current px-4 py-2 font-medium text-[var(--color-accent,#3858e9)] no-underline",
  link: "inline-block",
};

export const type = "button";

export const definition: BlockDefinition = {
  label: "Button",
  category: "Design",
  icon: "button",
  placeholder: "Add text…",
  description: "Prompt visitors to take action with a button-style link.",
  settings: [
    {
      control: "toggle-group",
      label: "Style",
      setting: "style",
      default: "solid",
      options: [
        { value: "solid", label: "Solid" },
        { value: "outline", label: "Outline" },
        { value: "link", label: "Link" },
      ],
    },
    { control: "text", label: "Link URL", field: "url", placeholder: "https://…" },
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
      control: "text",
      label: "Link rel",
      setting: "rel",
      default: "",
      placeholder: "e.g. nofollow",
    },
    { control: "text", label: "Title attribute", setting: "title", default: "" },
  ],
  render(fields: Fields, settings?: Settings) {
    const style = STYLE_CLASS[String(settings?.style)] ?? STYLE_CLASS.solid;
    const rel = [
      settings?.linkTarget === "_blank" ? "noopener" : "",
      typeof settings?.rel === "string" ? settings.rel.trim() : "",
    ]
      .filter(Boolean)
      .join(" ");
    const attrs =
      (settings?.linkTarget === "_blank" ? ` target="_blank"` : "") +
      (rel ? ` rel="${escAttr(rel)}"` : "") +
      (typeof settings?.title === "string" && settings.title.trim()
        ? ` title="${escAttr(settings.title.trim())}"`
        : "");
    return `<a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="${escAttr(fields.url === undefined ? "#" : str(fields.url))}"${attrs} class="${style}">${str(fields.label)}</a>`;
  },
};
