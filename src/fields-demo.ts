// Inline-fields demo (fields.html): N independent PublrEditor instances on
// one page — the EMBED SHOWCASE for the batteries-included layer. Everything
// interactive (slash picker, + inserter, floating toolbar, canvas styling)
// comes from attachInlineChrome + the shipped stylesheet; this file is only
// what a real host would write: register blocks, mount an editor per field,
// adapt the value.
//
// The many-instances case from thoughts/template-fields/002 — each field's
// VALUE is independent, so each field gets its own editor: content, history,
// and selection scoped per canvas. Block definitions are NOT per-instance:
// the registry is global by design (same defs as demo.ts).

import { attachInlineChrome, createEditor } from "./index";
import { registerCoreBlocks } from "./blocks";
import type { Editor } from "./index";
import "./fields.css";

// The canonical core block set (src/blocks/ — one file per block).
registerCoreBlocks();

/**
 * Mount one field: its own editor + the default chrome, seeded from its own
 * <template>, publishing its own value. The data-pipeline downcast IS the
 * stored value — what a CMS form adapter would submit for this field.
 */
function mountField(field: HTMLElement): Editor {
  const canvas = field.querySelector<HTMLElement>("[data-pbe-canvas]")!;
  const seed = field.querySelector<HTMLTemplateElement>("template[data-pbe-seed]")!;
  const valueEl = field.querySelector<HTMLElement>("[data-pbe-value]")!;

  const editor = createEditor({
    canvas,
    defaultBlock: "paragraph",
    groupBlock: "group", // ⌘G wraps a multi-selection, ⇧⌘G unwraps
    placeholder: canvas.getAttribute("data-pbe-placeholder") ?? "",
    onChange: () => {
      valueEl.textContent = editor.serialize({ pipeline: "data" });
    },
  });
  attachInlineChrome(editor, { container: field });

  // The seed rides fields.html's own indentation (the formatter wraps long
  // lines); collapse it so carrier values don't carry the page's formatting.
  editor.loadHtml(seed.innerHTML.replace(/\s+/g, " ").trim());
  return editor;
}

const editors = [...document.querySelectorAll<HTMLElement>(".field")].map(mountField);

// Poke at the instances from the console: fieldEditors[1].undo(), etc.
declare global {
  interface Window {
    fieldEditors?: Editor[];
  }
}
window.fieldEditors = editors;
