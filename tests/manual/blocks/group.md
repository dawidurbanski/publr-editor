---
title: Group
---

The plain layout container — no fields, no layout classes of its own; the root
is the children slot. Its only control is the shared "Transform to" switch,
which swaps the block for Row / Stack / Grid in place.

## Checks

- [ ] Click into the heading and paragraph inside the group — both edit in place.
- [ ] Select the Group container — the breadcrumb reads Document › Group; a child reads Document › Group › Paragraph.
- [ ] Sidebar → Block shows "Transform to" with Group pressed; picking Row swaps the block in place — children survive, and the wire output re-emits with the row classes.
- [ ] Undo the transform — the block is a Group again.
- [ ] Select the two loose paragraphs below the group and press ⌘G — they wrap in a new Group; ⇧⌘G on that group dissolves it back to loose paragraphs.
- [ ] List view nests Heading and Paragraph under Group.

## Fixture

```html
<div data-pb-block="group" data-pb-children>
  <h2 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Grouped content</h2>
  <p data-pb-block="paragraph" data-pb-rich="body">A paragraph living inside the group's slot.</p>
</div>
<p data-pb-block="paragraph" data-pb-rich="body">
  Loose paragraph one — select me together with the next…
</p>
<p data-pb-block="paragraph" data-pb-rich="body">
  …and loose paragraph two, then ⌘G to wrap us in a group.
</p>
```
