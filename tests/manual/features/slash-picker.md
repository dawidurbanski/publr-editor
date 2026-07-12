---
title: Slash picker & inline inserter
---

The in-canvas insertion affordances every embedder gets from
`attachInlineChrome`: "/" in an empty block opens the quick picker; the empty
block's ghost row carries a + that opens the inline inserter.

## Checks

- [ ] Type "/" in the empty paragraph — the quick picker opens at the block.
- [ ] Keep typing to filter ("/hea"); ArrowUp/Down move the highlight; Enter applies — the paragraph TRANSFORMS into the picked block.
- [ ] Escape closes the picker and the "/" text remains editable.
- [ ] Hover/focus the empty paragraph — the ghost row shows a +; clicking it opens the inline inserter (search + grid).
- [ ] Picking from the inline inserter replaces the empty paragraph.
- [ ] "Browse all" hands off to the left library rail, and picking there still targets the same empty block.
- [ ] "/" mid-text in a FILLED paragraph does not open the picker — it's an empty-block affordance.

## Fixture

```html
<p data-pb-block="paragraph" data-pb-rich="body">
  Filled paragraph — "/" here should just type a slash.
</p>
<p data-pb-block="paragraph" data-pb-rich="body"></p>
```
