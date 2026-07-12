---
title: Row
---

Horizontal container variant of Group — the baseline classes
`flex flex-row [&>*]:flex-1` ride the wire, so children share the row in
equal widths. Only control is the shared "Transform to" switch.

## Checks

- [ ] The three paragraphs render side by side in equal widths, not stacked.
- [ ] Click into each paragraph — all edit in place; typing more text in one doesn't change the width split.
- [ ] Select the Row container — the breadcrumb reads Document › Row; a child reads Document › Row › Paragraph.
- [ ] Sidebar → Block shows "Transform to" with Row pressed; picking Stack turns the layout vertical in place, children intact.
- [ ] Undo the transform — the paragraphs sit side by side again.
- [ ] List view nests the three Paragraphs under Row.

## Fixture

```html
<div data-pb-block="row" class="flex flex-row [&>*]:flex-1" data-pb-children>
  <p data-pb-block="paragraph" data-pb-rich="body">First cell of the row.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">Second cell — same width as its siblings.</p>
  <p data-pb-block="paragraph" data-pb-rich="body">
    Third cell, a little longer so the equal split is visible.
  </p>
</div>
```
