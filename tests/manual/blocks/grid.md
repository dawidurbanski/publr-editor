---
title: Grid
---

Grid container variant of Group — the baseline classes `grid grid-cols-2`
ride the wire, laying children out two per row. Only control is the shared
"Transform to" switch.

## Checks

- [ ] The four paragraphs render as a 2×2 grid — two per row, equal columns.
- [ ] Click into each cell — all edit in place.
- [ ] Select the Grid container — the breadcrumb reads Document › Grid; a cell reads Document › Grid › Paragraph.
- [ ] Sidebar → Block shows "Transform to" with Grid pressed; picking Group collapses the grid to plain flow in place, children intact.
- [ ] Undo the transform — the 2×2 grid returns.
- [ ] List view nests the four Paragraphs under Grid.

## Fixture

```html
<div data-pb-block="grid" class="grid grid-cols-2" data-pb-children>
  <p data-pb-block="paragraph" data-pb-rich="body">Cell one — top left.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">Cell two — top right.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">Cell three — bottom left.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">Cell four — bottom right, closing the 2×2.</p>
</div>
```
