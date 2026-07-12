---
title: Style — Border (C4)
---

Border width, color, and radius (story #413; E1 #428 native vocabulary). A
block opts in via `supports.border` (paragraph: all three). Width steps are
the fixed v4 utilities (1 → `border`, 2/4/8 → `border-N`); radius comes from
the theme's `radius-*` tokens (`rounded-lg`); color swatches are theme tokens
(`border-brand`); custom values go arbitrary (`rounded-[5px]`,
`border-[#111]`). Same policy gate. Picking a color with no width auto-applies
width 1 (a 0-width border is invisible).

## Checks

- [ ] Select a paragraph → the sidebar shows a Border section: Width (1/2/4/8), Color swatches, and a Radius scale (sm–xl).
- [ ] Pick a width → the paragraph gets a visible border.
- [ ] Pick a border color → the border recolors.
- [ ] Pick a radius → the corners round.
- [ ] The "data" output carries `border-*` / `border-[…]` / `rounded-*` and no `data-pb-style` island.

## Fixture

```html
<p data-pb-block="paragraph" data-pb-rich="body">
  Give me a border — width, color, and rounded corners from the sidebar.
</p>
```
