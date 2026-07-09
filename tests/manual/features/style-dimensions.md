---
title: Style — Dimensions (C3)
---

Padding + Margin (story #412; E1 #428 made the steps NUMERIC — v4's spacing is
a multiplier, `p-4` = 4 × `--spacing`, so any number is a valid step). A block
opts in via `supports.spacing` (paragraph: both). The control offers the
0–16 step row; custom values become arbitrary utilities (`p-[12px]`). Same
policy gate; re-clicking the active step clears it.

## Checks

- [ ] Select a paragraph → the sidebar shows Padding and Margin scale rows.
- [ ] Pick a Padding step → the paragraph gains inner spacing (`p-*`).
- [ ] Pick a Margin step → outer spacing changes (`m-*`).
- [ ] Re-click the active step → it clears.
- [ ] The "data" output carries `p-*` / `m-*` and no `data-pb-style` island.

## Fixture

```html
<p data-pb-block="paragraph" data-pb-rich="body">
  Give me padding and margin from the sidebar — steps 0 through 16.
</p>
<p data-pb-block="paragraph" data-pb-rich="body">A neighbour, so the margin is visible.</p>
```
