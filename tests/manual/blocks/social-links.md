---
title: Social links
---

A row of social icon links — the container only lays the icons out; each
child is the internal Social icon block (covered by this test), whose `url`
is the link carrier on the anchor and whose `service` island derives the
inline brand SVG and accessible name on every render.

## Checks

- [ ] Three icons render in a horizontal row: generic link, GitHub, X.
- [ ] Select an icon — the breadcrumb reads Document › Social links › Social icon.
- [ ] The GitHub icon's sidebar shows "Service" set to GitHub and "Profile URL" reading the github.com address.
- [ ] Change the GitHub icon's "Service" to Mastodon — the SVG swaps immediately and the anchor's accessible name follows; undo restores GitHub.
- [ ] The first icon's wire output (⋮ → Show output) has no island (Link is the default service); the other two carry `service` islands.
- [ ] Edit "Profile URL" on the first icon — the anchor's `href` in the output follows.
- [ ] List view nests three Social icon children under Social links.

## Fixture

```html
<div data-pb-block="social-links" data-pb-children class="flex flex-wrap items-center gap-3">
  <a
    data-pb-block="social-link"
    data-pb-link="url"
    href="https://dawidurbanski.com"
    aria-label="Link"
    class="inline-flex text-current"
    ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6 fill-current">
      <g
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M13.75 10.25a3.5 3.5 0 0 1 0 4.95l-2.55 2.55a3.5 3.5 0 0 1-4.95-4.95l1.3-1.3" />
        <path d="M10.25 13.75a3.5 3.5 0 0 1 0-4.95l2.55-2.55a3.5 3.5 0 0 1 4.95 4.95l-1.3 1.3" />
      </g></svg
  ></a>
  <a
    data-pb-block="social-link"
    data-pb-link="url"
    href="https://github.com/publr"
    aria-label="GitHub"
    class="inline-flex text-current"
    ><script type="application/json" data-pb-settings>
      { "service": "github" }
    </script>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6 fill-current">
      <path
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      /></svg
  ></a>
  <a
    data-pb-block="social-link"
    data-pb-link="url"
    href="https://x.com/publr"
    aria-label="X"
    class="inline-flex text-current"
    ><script type="application/json" data-pb-settings>
      { "service": "x" }
    </script>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6 fill-current">
      <path
        d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
      /></svg
  ></a>
</div>
```
