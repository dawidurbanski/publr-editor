---
title: Stack
---

Vertical container variant of Group — the baseline classes `flex flex-col`
ride the wire; children flow top to bottom. Only control is the shared
"Transform to" switch.

## Checks

- [ ] The heading and paragraphs render stacked top to bottom inside the container.
- [ ] Click into each child — all edit in place.
- [ ] Select the Stack container — the breadcrumb reads Document › Stack; a child reads Document › Stack › Paragraph.
- [ ] Sidebar → Block shows "Transform to" with Stack pressed; picking Row turns the same children horizontal in place.
- [ ] Undo the transform — the vertical stack returns.
- [ ] List view nests Heading and two Paragraphs under Stack.

## Fixture

```html
<div data-pb-block="stack" class="flex flex-col" data-pb-children>
  <h2 data-pb-block="heading" data-pb-tag="level" data-pb-text="text">Stacked content</h2>
  <p data-pb-block="paragraph" data-pb-rich="body">First item in the stack.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">Second item — flows directly below the first.</p>
</div>
```
