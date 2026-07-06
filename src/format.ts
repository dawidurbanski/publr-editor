// format.ts — in-house inline formatting for rich carriers. No execCommand:
// formatting is a PURE MODEL TRANSFORM riding the machinery we already have
// (commit() history, rerenderBlock, the wire contract).
//
// The engine flattens a carrier's inline content into a sequence of ITEMS —
// one per text character, each carrying a Set of marks derived from its
// formatting ancestors (b/strong → bold, i/em → italic) — plus opaque ATOMS
// for any other inline element (span, a, svg, br, …), preserved verbatim
// with their surrounding marks. Toggling a mark over the selected span is
// then trivial set arithmetic, and serialization re-emits canonical, stably
// nested HTML (<b> outside <i>; strong/em normalize to b/i on the first edit
// of a field). Every overlap case — partial bold, un-bolding the middle of a
// run, italic across mixed content — is the same flatten → mark → rebuild.
//
// Atoms are units: a selection boundary inside one snaps to include it whole
// (splitting a link's text is a later refinement).

import { escHtml } from "./carriers";

export type MarkName = "bold" | "italic";

export const MARKS: Record<MarkName, { tag: string; match: string[] }> = {
  bold: { tag: "b", match: ["b", "strong"] },
  italic: { tag: "i", match: ["i", "em"] },
};
const ORDER = Object.keys(MARKS) as MarkName[]; // canonical nesting: bold outermost

function markOfTag(tag: string): MarkName | null {
  for (const name of ORDER) if (MARKS[name].match.includes(tag)) return name;
  return null;
}

interface CharItem {
  ch: string;
  node: Text;
  off: number;
  marks: Set<MarkName>;
  atom?: undefined;
}
interface AtomItem {
  atom: Element;
  marks: Set<MarkName>;
  ch?: undefined;
  node?: undefined;
  off?: undefined;
}
type Item = CharItem | AtomItem;

// Flatten the carrier: [{ ch, node, off, marks } | { atom, marks }, …]
function tokenize(carrier: Element): Item[] {
  const items: Item[] = [];
  (function walk(node: Node, marks: MarkName[]) {
    for (const child of node.childNodes) {
      if (child instanceof Text) {
        for (let off = 0; off < child.data.length; off++) {
          items.push({ ch: child.data[off], node: child, off, marks: new Set(marks) });
        }
      } else if (child instanceof Element) {
        const mark = markOfTag(child.tagName.toLowerCase());
        if (mark) walk(child, [...marks, mark]);
        else items.push({ atom: child, marks: new Set(marks) });
      }
    }
  })(carrier, []);
  return items;
}

// The contiguous [start, end) item span covered by a Range. Chars are in the
// span when their point sits inside the range (end boundary exclusive);
// atoms when the range intersects them at all (atoms are units).
function selectedSpan(items: Item[], range: Range): [number, number] | null {
  let start = -1;
  let end = -1;
  items.forEach((it, i) => {
    const inside =
      it.ch != null
        ? range.comparePoint(it.node, it.off) === 0 &&
          !(it.node === range.endContainer && it.off === range.endOffset)
        : range.intersectsNode(it.atom);
    if (inside) {
      if (start < 0) start = i;
      end = i + 1;
    }
  });
  return start < 0 ? null : [start, end];
}

// Canonical serialization: recurse mark by mark, grouping maximal runs.
function emit(items: Item[], order: readonly MarkName[] = ORDER): string {
  if (!order.length)
    return items.map((it) => (it.ch != null ? escHtml(it.ch) : it.atom.outerHTML)).join("");
  const [mark, ...rest] = order;
  const t = MARKS[mark].tag;
  let out = "";
  let run: Item[] = [];
  let inMark: boolean | null = null;
  const flush = () => {
    if (!run.length) return;
    const inner = emit(run, rest);
    out += inMark ? `<${t}>${inner}</${t}>` : inner;
    run = [];
  };
  for (const it of items) {
    const has = it.marks.has(mark);
    if (inMark !== null && has !== inMark) flush();
    inMark = has;
    run.push(it);
  }
  flush();
  return out;
}

/** {bold, italic} for the given selection range — true when EVERY item in the span has the mark. */
export function formatState(carrier: Element | null, range: Range | null): Record<string, boolean> {
  const state: Record<string, boolean> = Object.fromEntries(ORDER.map((m) => [m, false]));
  if (!carrier || !range) return state;
  const items = tokenize(carrier);
  const span = selectedSpan(items, range);
  if (!span) return state;
  const slice = items.slice(span[0], span[1]);
  for (const mark of ORDER) state[mark] = slice.every((it) => it.marks.has(mark));
  return state;
}

/**
 * Toggle `mark` over the range. All-or-any semantics: if every item in the
 * span has the mark, remove it; otherwise add it to all. Returns the field's
 * new HTML plus the item span (indices survive the re-render — the item
 * count is unchanged), or null when there is nothing to format.
 */
export function toggleMark(
  carrier: Element,
  range: Range,
  mark: string,
): { html: string; start: number; end: number } | null {
  if (!(mark in MARKS)) return null;
  const m = mark as MarkName;
  const items = tokenize(carrier);
  const span = selectedSpan(items, range);
  if (!span) return null;
  const slice = items.slice(span[0], span[1]);
  const all = slice.every((it) => it.marks.has(m));
  for (const it of slice) {
    if (all) it.marks.delete(m);
    else it.marks.add(m);
  }
  return { html: emit(items), start: span[0], end: span[1] };
}

/** Re-select the item span [start, end) inside a (freshly re-rendered) carrier. */
export function selectItemRange(carrier: Element, start: number, end: number): void {
  const items = tokenize(carrier);
  const startIt = items[start];
  const endIt = items[end - 1];
  if (!startIt || !endIt) return;
  const range = document.createRange();
  if (startIt.ch != null) range.setStart(startIt.node, startIt.off);
  else range.setStartBefore(startIt.atom);
  if (endIt.ch != null) range.setEnd(endIt.node, endIt.off + 1);
  else range.setEndAfter(endIt.atom);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
