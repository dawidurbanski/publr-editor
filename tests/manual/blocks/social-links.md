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
    ><svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 fill-current">
      <path
        d="M15.6 7.2H14v1.5h1.6c2 0 3.7 1.7 3.7 3.7s-1.7 3.7-3.7 3.7H14v1.5h1.6c2.8 0 5.2-2.3 5.2-5.2 0-2.9-2.3-5.2-5.2-5.2zM4.7 12.4c0-2 1.7-3.7 3.7-3.7H10V7.2H8.4c-2.9 0-5.2 2.3-5.2 5.2 0 2.9 2.3 5.2 5.2 5.2H10v-1.5H8.4c-2 0-3.7-1.7-3.7-3.7zm4.6.9h5.3v-1.5H9.3v1.5z"
      ></path></svg
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
    <svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 fill-current">
      <path
        d="M12,2C6.477,2,2,6.477,2,12c0,4.419,2.865,8.166,6.839,9.489c0.5,0.09,0.682-0.218,0.682-0.484 c0-0.236-0.009-0.866-0.014-1.699c-2.782,0.602-3.369-1.34-3.369-1.34c-0.455-1.157-1.11-1.465-1.11-1.465 c-0.909-0.62,0.069-0.608,0.069-0.608c1.004,0.071,1.532,1.03,1.532,1.03c0.891,1.529,2.341,1.089,2.91,0.833 c0.091-0.647,0.349-1.086,0.635-1.337c-2.22-0.251-4.555-1.111-4.555-4.943c0-1.091,0.39-1.984,1.03-2.682 C6.546,8.54,6.202,7.524,6.746,6.148c0,0,0.84-0.269,2.75,1.025C10.295,6.95,11.15,6.84,12,6.836 c0.85,0.004,1.705,0.114,2.504,0.336c1.909-1.294,2.748-1.025,2.748-1.025c0.546,1.376,0.202,2.394,0.1,2.646 c0.64,0.699,1.026,1.591,1.026,2.682c0,3.841-2.337,4.687-4.565,4.935c0.359,0.307,0.679,0.917,0.679,1.852 c0,1.335-0.012,2.415-0.012,2.741c0,0.269,0.18,0.579,0.688,0.481C19.138,20.161,22,16.416,22,12C22,6.477,17.523,2,12,2z"
      ></path></svg
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
    <svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 fill-current">
      <path
        d="M13.982 10.622 20.54 3h-1.554l-5.693 6.618L8.745 3H3.5l6.876 10.007L3.5 21h1.554l6.012-6.989L15.868 21h5.245l-7.131-10.378Zm-2.128 2.474-.697-.997-5.543-7.93H8l4.474 6.4.697.996 5.815 8.318h-2.387l-4.745-6.787Z"
      ></path></svg
  ></a>
</div>
```
