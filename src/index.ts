// PublrEditor — public entry point. Re-exports only; the implementation
// lives in focused modules:
//
//   carriers.ts   wire-contract primitives (carrier vocabulary, escaping, scoping)
//   registry.ts   global block registry + the probe (render({}) → derived fields)
//   cast.ts       upcast / downcast — annotated HTML ⇄ block model
//   history.ts    snapshot stacks + coalescing + reactive canUndo/canRedo
//   editor.ts     createEditor — canvas, events, the commit() choke point
//
// Speaks the HTML wire contract v0 (data-pb-* attributes + permissive upcast;
// same contract as editor/CONTRACT.md, new implementation). Current scope:
// block tree (data-pb-children slots — tree.ts holds the traversal),
// text/rich/tag carriers, contenteditable canvas, undo/redo, group/ungroup.
// No settings islands, no chrome — features land one at a time.
//
// Architecture (thoughts/visual-builder/007):
// - GLOBAL registry: registerBlock(type, def) is THE public registration
//   surface — Publr core, plugins, and the devtools console all use the same
//   call. The render is the schema: fields are derived by probing render({}).
// - Every model mutation flows through one commit() choke point where history
//   is recorded; native browser undo is disowned inside the canvas.
// - The canvas is an uncontrolled contenteditable surface: model → DOM only
//   via explicit renders, DOM → model only via input events. Reactivity
//   drives chrome (the history store), never the canvas.

import { CHILDREN_ATTR, RAW_TYPE, cloneValue, escAttr, escHtml, str } from "./carriers";
import { blockTypes, getBlockType, registerBlock, unregisterBlock } from "./registry";
import { blockToElement, downcast, upcast } from "./cast";
import { createEditor } from "./editor";
import { attachInlineChrome } from "./chrome-inline";
import { DEFAULT_BLOCK_POLICY, resolveBlockPolicy, resolveRootPolicy } from "./policy";
import { ICONS, iconRef, iconSvg, mountIconSprite } from "./icons";
import { flattenBlocks, locateBlock, pathToBlock } from "./tree";
import {
  MEDIA_PREFIX,
  deleteMedia,
  getMedia,
  listMedia,
  mediaStoreSupported,
  putMedia,
  registerMediaWorker,
} from "./media-store";

export {
  CHILDREN_ATTR,
  RAW_TYPE,
  cloneValue,
  str,
  blockTypes,
  escAttr,
  escHtml,
  getBlockType,
  registerBlock,
  unregisterBlock,
  blockToElement,
  downcast,
  upcast,
  createEditor,
  attachInlineChrome,
  resolveRootPolicy,
  resolveBlockPolicy,
  DEFAULT_BLOCK_POLICY,
  flattenBlocks,
  locateBlock,
  pathToBlock,
  // Interim icon set (generated from @wordpress/icons — see scripts/extract-icons.mjs):
  // chrome layers resolve declared icon NAMES against it, inline (iconSvg) or
  // as a bindable sprite (mountIconSprite + iconRef).
  ICONS,
  iconSvg,
  iconRef,
  mountIconSprite,
  // In-browser media persistence (OPFS + /media/* service worker) — the
  // media control's storage; hosts with a real media library skip it.
  MEDIA_PREFIX,
  mediaStoreSupported,
  putMedia,
  getMedia,
  listMedia,
  deleteMedia,
  registerMediaWorker,
};

export type { Block, CarrierKind, FieldValue, ImageValue, Model } from "./carriers";
export type { DowncastPipeline } from "./cast";
export type {
  BlockDefinition,
  BlockType,
  FieldSpec,
  Fields,
  SettingOption,
  SettingSpec,
} from "./registry";
export type { Editor, EditorOptions } from "./editor";
export type { BlockPolicy, EditorPolicy, PolicyConfig, RootPolicy } from "./policy";
export type { InlineChromeOptions } from "./chrome-inline";
export type { HistoryFlags } from "./history";
export type { SelectionState } from "./selection";
export type { LocatedBlock, SiblingRun } from "./tree";

declare global {
  interface Window {
    Publr?: import("../vendor/publr/publr.js").PublrGlobal;
  }
}

// Console access is a supported input (blocks can be registered straight from
// devtools), so the API hangs off the one global PublrJS already claims —
// window.Publr, set by the runtime import above (import order guarantees it
// exists here) — instead of minting a clash-prone global of its own. Editor
// INSTANCES are the host's business; the demo exposes its one as Publr.editor.
if (typeof window !== "undefined" && window.Publr) {
  window.Publr.Editor = {
    RAW_TYPE,
    escHtml,
    escAttr,
    registerBlock,
    unregisterBlock,
    getBlockType,
    blockTypes,
    upcast,
    downcast,
    blockToElement,
    createEditor,
    attachInlineChrome,
  };
}
