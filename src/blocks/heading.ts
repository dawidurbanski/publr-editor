// Heading block — h1–h6 (Gutenberg core/heading).

import { escHtml } from "../carriers";
import type { BlockDefinition, Fields } from "../registry";

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

export const type = "heading";

export const definition: BlockDefinition = {
  label: "Heading",
  category: "Text",
  icon: "heading",
  placeholder: "Heading", // ghost prompt while empty (editor-UI metadata)
  description:
    "Introduce new sections and organize content to help visitors (and search engines) understand the structure of your content.",
  // The level control is DECLARED metadata: the tag carrier derives that the
  // field exists, but not which tags it may take — that's the render's
  // fallback logic, unreadable from markup (thoughts/visual-builder/007).
  settings: [
    {
      control: "toggle-group",
      label: "Level",
      field: "level",
      options: HEADING_TAGS.map((t, i) => ({
        value: t,
        label: t.toUpperCase(),
        icon: `heading-level-${i + 1}`,
      })),
    },
  ],
  // The render is the schema: probing this with {} derives fields
  // text (default "") and level (tag, default "h2" — the fallback below).
  render(fields: Fields) {
    const level = typeof fields.level === "string" ? fields.level : "";
    const tag = HEADING_TAGS.includes(level) ? level : "h2";
    return `<${tag} data-pb-block="heading" data-pb-tag="level" data-pb-text="text">${escHtml(fields.text ?? "")}</${tag}>`;
  },
};
