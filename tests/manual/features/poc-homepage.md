---
title: POC homepage — real-world Tailwind stress test
wide: true
---

The POC editor's stress fixture (Tailwind Plus dark homepage: 113 typed
blocks, ~184 unique utilities incl. variants, masks, arbitrary values, 5
raw-html SVG passthroughs) loaded into publr-editor. Converted from the POC
vocabulary by exactly two renames: `section` → `group`, `data-pb-slot` →
`data-pb-children` (every other carrier — heading/paragraph/button/icon/image,
settings islands, data-pb-pattern — is contract-identical). Theme = the full
Tailwind default. **Open with `?wide`:** `/?wide&fixture=features/poc-homepage`
— a full-bleed page can't read faithfully in the 660px article column (desktop
media queries stay active while the layout crams). REQUIRES the jit bridge
(`cd ../jit && zig build`, then `npm run dev`): fixture classes are
deliberately excluded from the build CSS (they're content, not chrome), so the
engine is the only thing styling this page — which is the point.

**Composed of PATTERNS (Phase B):** each page section carries
`data-pb-pattern="home-*"` — the page is seven registered patterns (hero /
logo-cloud / feature-cards / feature-showcase / stats / cta / footer,
src/blocks/homepage-patterns.ts) around the bg + `<main>` shell. The inserter
offers each under its category; the sidebar shows the pattern label per section.

## Checks

- [ ] The page renders faithfully (dark hero, logo cloud, features, stats, CTA, footer) — with the bridge live it should look like the real Tailwind Plus template.
- [ ] Each section shows as a PATTERN instance (sidebar shows its pattern label); the inserter's pattern explorer lists all seven `home-*` sections under their categories.
- [ ] Insert another (e.g. "Stats") from the pattern explorer → a clean independent copy drops in.
- [ ] Select the H1 → Font size control shows `5xl` ACTIVE (a pasted class registering in a lens).
- [ ] Change it → `text-5xl` is replaced, not shadowed (check the wire output).
- [ ] Select a paragraph → text color reads its `gray-*` token; pick another color → class swaps.
- [ ] Decorative SVGs are selectable as raw-html blocks (opaque, lossless) — and they survive INSIDE the patterns (untagged raw markup is allowed).
- [ ] List view shows the nested group tree; undo/redo work across edits.
- [ ] No (or few) amber "Not in your theme" chips — the full default theme resolves the template. Report any chip: it's either a real gap or a shape-detector false positive.

## Fixture

```json
{ "tokens": "default" }
```

```html
<!-- Stress test: cms/themes/demo/content/index.publr (Tailwind Plus dark
     homepage) recreated as editor blocks. Classes are copied verbatim from
     the template and live on block roots as authored classes (canonical
     carrier). Decorative SVG art passes through as raw-html blocks. No
     data-pb-id anywhere — the editor mints them (AI-authoring parity).
     The <Base> wrapper + frontmatter belong to the page template, not the
     editable content region. -->
<div data-pb-doc data-pb-contract="0">
  <div data-pb-block="group" data-pb-tag="tag" data-pb-children class="bg-gray-900">
    <main data-pb-block="group" data-pb-tag="tag" data-pb-children>
      <!-- Hero -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-hero"
        data-pb-tag="tag"
        data-pb-children
        class="relative isolate overflow-hidden bg-gray-900"
      >
        <svg
          aria-hidden="true"
          class="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
        >
          <defs>
            <pattern
              id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
              width="200"
              height="200"
              x="50%"
              y="-1"
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y="-1" class="overflow-visible fill-gray-800/20">
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              stroke-width="0"
            />
          </svg>
          <rect
            width="100%"
            height="100%"
            fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
            stroke-width="0"
          />
        </svg>
        <div
          aria-hidden="true"
          class="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
        >
          <div
            style="clip-path: polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)"
            class="aspect-1108/632 w-277 bg-linear-to-r from-[#80caff] to-[#4f46e5] opacity-20"
          ></div>
        </div>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40"
        >
          <div
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:pt-8"
          >
            <img
              data-pb-block="image"
              data-pb-image="image"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&amp;shade=500"
              alt="Your Company"
              class="h-11"
            />
            <div
              data-pb-block="group"
              data-pb-tag="tag"
              data-pb-children
              class="mt-24 sm:mt-32 lg:mt-16"
            >
              <div
                data-pb-block="group"
                data-pb-pattern="badge"
                data-pb-tag="tag"
                data-pb-children
                class="inline-flex items-center space-x-6"
              >
                <div
                  data-pb-block="paragraph"
                  class="rounded-full bg-indigo-500/10 px-3 py-1 text-sm/6 font-semibold text-indigo-400 ring-1 ring-indigo-500/25 ring-inset"
                >
                  <div data-pb-rich="body">What's new</div>
                </div>
                <div
                  data-pb-block="group"
                  data-pb-tag="tag"
                  data-pb-children
                  class="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-300"
                >
                  <a data-pb-block="button" data-pb-rich="label" data-pb-link="url" href="#"
                    ><script type="application/json" data-pb-settings>
                      { "style": "link" }
                    </script>
                    Just shipped v1.0</a
                  >
                  <span data-pb-block="icon" data-pb-rich="svg"
                    ><svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                      class="size-5 text-gray-500"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M9.5 6l6 6-6 6" />
                      </g></svg
                  ></span>
                </div>
              </div>
            </div>
            <h1
              data-pb-block="heading"
              data-pb-tag="level"
              data-pb-rich="text"
              class="mt-10 text-5xl font-semibold tracking-tight text-pretty text-white sm:text-7xl"
            >
              Deploy to the cloud with confidence
            </h1>
            <div
              data-pb-block="paragraph"
              class="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8"
            >
              <div data-pb-rich="body">
                Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat
                commodo. Elit sunt amet fugiat veniam occaecat.
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-tag="tag"
              data-pb-children
              class="mt-10 flex items-center gap-x-6"
            >
              <a
                data-pb-block="button"
                data-pb-rich="label"
                data-pb-link="url"
                href="#"
                class="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                ><script type="application/json" data-pb-settings>
                  { "style": "link" }
                </script>
                Get started</a
              >
              <a
                data-pb-block="button"
                data-pb-rich="label"
                data-pb-link="url"
                href="#"
                class="text-sm/6 font-semibold text-white"
                ><script type="application/json" data-pb-settings>
                  { "style": "link" }
                </script>
                Learn more <span aria-hidden="true">→</span></a
              >
            </div>
          </div>
          <div
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32"
          >
            <div
              data-pb-block="group"
              data-pb-tag="tag"
              data-pb-children
              class="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none"
            >
              <img
                data-pb-block="image"
                data-pb-image="image"
                width="2432"
                height="1442"
                src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
                alt="App screenshot"
                class="w-304 rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Logo cloud -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-logo-cloud"
        data-pb-tag="tag"
        data-pb-children
        class="bg-gray-900 mx-auto mt-8 max-w-7xl px-6 sm:mt-16 lg:px-8"
      >
        <h2
          data-pb-block="heading"
          data-pb-tag="level"
          data-pb-rich="text"
          class="text-center text-lg/8 font-semibold text-white"
        >
          The world's most innovative companies use our app
        </h2>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5"
        >
          <img
            data-pb-block="image"
            data-pb-image="image"
            width="158"
            height="48"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/transistor-logo-white.svg"
            alt="Transistor"
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
          />
          <img
            data-pb-block="image"
            data-pb-image="image"
            width="158"
            height="48"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/reform-logo-white.svg"
            alt="Reform"
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
          />
          <img
            data-pb-block="image"
            data-pb-image="image"
            width="158"
            height="48"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/tuple-logo-white.svg"
            alt="Tuple"
            class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
          />
          <img
            data-pb-block="image"
            data-pb-image="image"
            width="158"
            height="48"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/savvycal-logo-white.svg"
            alt="SavvyCal"
            class="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1"
          />
          <img
            data-pb-block="image"
            data-pb-image="image"
            width="158"
            height="48"
            src="https://tailwindcss.com/plus-assets/img/logos/158x48/statamic-logo-white.svg"
            alt="Statamic"
            class="col-span-2 col-start-2 max-h-12 w-full object-contain sm:col-start-auto lg:col-span-1"
          />
        </div>
      </div>

      <!-- Feature section (cards) -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-feature-cards"
        data-pb-tag="tag"
        data-pb-children
        class="bg-gray-900 mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8"
      >
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto max-w-2xl lg:text-center"
        >
          <h2
            data-pb-block="heading"
            data-pb-tag="level"
            data-pb-rich="text"
            class="text-base/7 font-semibold text-indigo-400"
          >
            Deploy faster
          </h2>
          <div
            data-pb-block="paragraph"
            class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl lg:text-balance"
          >
            <div data-pb-rich="body">Everything you need to deploy your app</div>
          </div>
          <div data-pb-block="paragraph" class="mt-6 text-lg/8 text-gray-300">
            <div data-pb-rich="body">
              Quis tellus eget adipiscing convallis sit sit eget aliquet quis. Suspendisse eget
              egestas a elementum pulvinar et feugiat blandit at. In mi viverra elit nunc.
            </div>
          </div>
        </div>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none"
        >
          <dl
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
          >
            <div
              data-pb-block="group"
              data-pb-pattern="feature-card"
              data-pb-tag="tag"
              data-pb-children
              class="flex flex-col"
            >
              <span
                data-pb-block="icon"
                data-pb-rich="svg"
                class="mb-6 flex size-10 items-center justify-center rounded-lg bg-indigo-500"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-6 text-white"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M13 3.5L5.75 13.25h5.5L11 20.5l7.25-9.75h-5.5z" />
                  </g></svg
              ></span>
              <h3
                data-pb-block="heading"
                data-pb-tag="level"
                data-pb-rich="text"
                class="text-base/7 font-semibold text-white"
              >
                Server monitoring
              </h3>
              <div data-pb-block="paragraph" class="mt-1 flex-auto text-base/7 text-gray-400">
                <div data-pb-rich="body">
                  Non quo aperiam repellendus quas est est. Eos aut dolore aut ut sit nesciunt. Ex
                  tempora quia. Sit nobis consequatur dolores incidunt.
                </div>
              </div>
              <a
                data-pb-block="button"
                data-pb-rich="label"
                data-pb-link="url"
                href="#"
                class="mt-6 text-sm/6 font-semibold text-indigo-400 hover:text-indigo-300"
                ><script type="application/json" data-pb-settings>
                  { "style": "link" }
                </script>
                Learn more <span aria-hidden="true">→</span></a
              >
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="feature-card"
              data-pb-tag="tag"
              data-pb-children
              class="flex flex-col"
            >
              <span
                data-pb-block="icon"
                data-pb-rich="svg"
                class="mb-6 flex size-10 items-center justify-center rounded-lg bg-indigo-500"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-6 text-white"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="9" cy="8.25" r="3.25" />
                    <path d="M3.75 19.5c.5-3.4 2.6-5.25 5.25-5.25s4.75 1.85 5.25 5.25" />
                    <circle cx="16.75" cy="9.25" r="2.5" />
                    <path d="M15.75 14.75c2.3.3 4 2 4.5 4.75" />
                  </g></svg
              ></span>
              <h3
                data-pb-block="heading"
                data-pb-tag="level"
                data-pb-rich="text"
                class="text-base/7 font-semibold text-white"
              >
                Collaborate
              </h3>
              <div data-pb-block="paragraph" class="mt-1 flex-auto text-base/7 text-gray-400">
                <div data-pb-rich="body">
                  Vero eum voluptatem aliquid nostrum voluptatem. Vitae esse natus. Earum nihil
                  deserunt eos quasi cupiditate. A inventore et molestiae natus.
                </div>
              </div>
              <a
                data-pb-block="button"
                data-pb-rich="label"
                data-pb-link="url"
                href="#"
                class="mt-6 text-sm/6 font-semibold text-indigo-400 hover:text-indigo-300"
                ><script type="application/json" data-pb-settings>
                  { "style": "link" }
                </script>
                Learn more <span aria-hidden="true">→</span></a
              >
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="feature-card"
              data-pb-tag="tag"
              data-pb-children
              class="flex flex-col"
            >
              <span
                data-pb-block="icon"
                data-pb-rich="svg"
                class="mb-6 flex size-10 items-center justify-center rounded-lg bg-indigo-500"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-6 text-white"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="4" y="5.5" width="16" height="15" rx="2" />
                    <path d="M4 10.25h16" />
                    <path d="M8 3.5v4" />
                    <path d="M16 3.5v4" />
                  </g></svg
              ></span>
              <h3
                data-pb-block="heading"
                data-pb-tag="level"
                data-pb-rich="text"
                class="text-base/7 font-semibold text-white"
              >
                Task scheduling
              </h3>
              <div data-pb-block="paragraph" class="mt-1 flex-auto text-base/7 text-gray-400">
                <div data-pb-rich="body">
                  Et quod quaerat dolorem quaerat architecto aliquam accusantium. Ex adipisci et
                  doloremque autem quia quam. Quis eos molestiae at iure impedit.
                </div>
              </div>
              <a
                data-pb-block="button"
                data-pb-rich="label"
                data-pb-link="url"
                href="#"
                class="mt-6 text-sm/6 font-semibold text-indigo-400 hover:text-indigo-300"
                ><script type="application/json" data-pb-settings>
                  { "style": "link" }
                </script>
                Learn more <span aria-hidden="true">→</span></a
              >
            </div>
          </dl>
        </div>
      </div>

      <!-- Feature section (screenshot + inline features) -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-feature-showcase"
        data-pb-tag="tag"
        data-pb-children
        class="bg-gray-900 mt-32 sm:mt-56"
      >
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <div
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mx-auto max-w-2xl sm:text-center"
          >
            <h2
              data-pb-block="heading"
              data-pb-tag="level"
              data-pb-rich="text"
              class="text-base/7 font-semibold text-indigo-400"
            >
              Everything you need
            </h2>
            <div
              data-pb-block="paragraph"
              class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl sm:text-balance"
            >
              <div data-pb-rich="body">No server? No problem.</div>
            </div>
            <div data-pb-block="paragraph" class="mt-6 text-lg/8 text-gray-300">
              <div data-pb-rich="body">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit. Maiores impedit
                perferendis suscipit eaque, iste dolor cupiditate blanditiis.
              </div>
            </div>
          </div>
        </div>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="relative overflow-hidden pt-16"
        >
          <div
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mx-auto max-w-7xl px-6 lg:px-8"
          >
            <img
              data-pb-block="image"
              data-pb-image="image"
              width="2432"
              height="1442"
              src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
              alt="App screenshot"
              class="mb-[-12%] rounded-xl shadow-2xl ring-1 ring-white/10"
            />
            <div aria-hidden="true" class="relative">
              <div class="absolute -inset-x-20 bottom-0 bg-linear-to-t from-gray-900 pt-[7%]"></div>
            </div>
          </div>
        </div>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8"
        >
          <dl
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base/7 text-gray-400 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16"
          >
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M6.75 18.5a4.25 4.25 0 0 1-.7-8.45 5.5 5.5 0 0 1 10.8-1.3 4.25 4.25 0 0 1 .4 8.4"
                    />
                    <path d="M12 20.5V13" />
                    <path d="M9.25 15.75L12 13l2.75 2.75" />
                  </g></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">Push to deploy.</span> Lorem ipsum, dolor
                  sit amet consectetur adipisicing elit aute id magna.
                </div>
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
                    <path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0v2.75" />
                  </g>
                  <circle cx="12" cy="15.25" r="1.4" fill="currentColor" stroke="none" /></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">SSL certificates.</span> Anim aute id magna
                  aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo.
                </div>
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4.75 4.75V9.5h4.75" />
                    <path d="M4.75 9.5a7.5 7.5 0 1 1-.65 4.75" />
                  </g></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">Simple queues.</span> Ac tincidunt sapien
                  vehicula erat auctor pellentesque rhoncus.
                </div>
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 3.5l7 2.5v5.25c0 4.25-2.9 7.6-7 9.25-4.1-1.65-7-5-7-9.25V6z" />
                    <path d="M9.25 12l2 2 3.5-4" />
                  </g></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">Advanced security.</span> Lorem ipsum,
                  dolor sit amet consectetur adipisicing elit aute id magna.
                </div>
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="3.25" />
                    <path d="M12 4.25V6.5" />
                    <path d="M12 17.5v2.25" />
                    <path d="M4.25 12H6.5" />
                    <path d="M17.5 12h2.25" />
                    <path d="M6.5 6.5l1.6 1.6" />
                    <path d="M15.9 15.9l1.6 1.6" />
                    <path d="M17.5 6.5l-1.6 1.6" />
                    <path d="M8.1 15.9l-1.6 1.6" />
                  </g></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">Powerful API.</span> Anim aute id magna
                  aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo.
                </div>
              </div>
            </div>
            <div
              data-pb-block="group"
              data-pb-pattern="inline-feature"
              data-pb-tag="tag"
              data-pb-children
              class="relative pl-9"
            >
              <span data-pb-block="icon" data-pb-rich="svg" class="absolute top-1 left-1"
                ><svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-5 text-indigo-400"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="4" y="4.5" width="16" height="6.5" rx="1.5" />
                    <rect x="4" y="13" width="16" height="6.5" rx="1.5" />
                  </g>
                  <circle cx="7.5" cy="7.75" r="1.1" fill="currentColor" stroke="none" />
                  <circle cx="7.5" cy="16.25" r="1.1" fill="currentColor" stroke="none" /></svg
              ></span>
              <div data-pb-block="paragraph">
                <div data-pb-rich="body">
                  <span class="font-semibold text-white">Database backups.</span> Ac tincidunt
                  sapien vehicula erat auctor pellentesque rhoncus.
                </div>
              </div>
            </div>
          </dl>
        </div>
      </div>

      <!-- Stats -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-stats"
        data-pb-tag="tag"
        data-pb-children
        class="bg-gray-900 mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8"
      >
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl"
        >
          <h2
            data-pb-block="heading"
            data-pb-tag="level"
            data-pb-rich="text"
            class="text-base/8 font-semibold text-indigo-400"
          >
            Our track record
          </h2>
          <div
            data-pb-block="paragraph"
            class="mt-2 text-4xl font-semibold tracking-tight text-pretty text-white sm:text-5xl"
          >
            <div data-pb-rich="body">Trusted by thousands of creators&nbsp;worldwide</div>
          </div>
          <div data-pb-block="paragraph" class="mt-6 text-lg/8 text-gray-300">
            <div data-pb-rich="body">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Maiores impedit perferendis
              suscipit eaque, iste dolor cupiditate blanditiis.
            </div>
          </div>
        </div>
        <dl
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 text-white sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-4"
        >
          <div
            data-pb-block="group"
            data-pb-pattern="stat"
            data-pb-tag="tag"
            data-pb-children
            class="flex flex-col gap-y-3 border-l border-white/10 pl-6"
          >
            <div data-pb-block="paragraph" class="text-sm/6">
              <div data-pb-rich="body">Developers on the platform</div>
            </div>
            <div
              data-pb-block="paragraph"
              class="order-first text-3xl font-semibold tracking-tight"
            >
              <div data-pb-rich="body">8,000+</div>
            </div>
          </div>
          <div
            data-pb-block="group"
            data-pb-pattern="stat"
            data-pb-tag="tag"
            data-pb-children
            class="flex flex-col gap-y-3 border-l border-white/10 pl-6"
          >
            <div data-pb-block="paragraph" class="text-sm/6">
              <div data-pb-rich="body">Daily requests</div>
            </div>
            <div
              data-pb-block="paragraph"
              class="order-first text-3xl font-semibold tracking-tight"
            >
              <div data-pb-rich="body">900m+</div>
            </div>
          </div>
          <div
            data-pb-block="group"
            data-pb-pattern="stat"
            data-pb-tag="tag"
            data-pb-children
            class="flex flex-col gap-y-3 border-l border-white/10 pl-6"
          >
            <div data-pb-block="paragraph" class="text-sm/6">
              <div data-pb-rich="body">Uptime guarantee</div>
            </div>
            <div
              data-pb-block="paragraph"
              class="order-first text-3xl font-semibold tracking-tight"
            >
              <div data-pb-rich="body">99.9%</div>
            </div>
          </div>
          <div
            data-pb-block="group"
            data-pb-pattern="stat"
            data-pb-tag="tag"
            data-pb-children
            class="flex flex-col gap-y-3 border-l border-white/10 pl-6"
          >
            <div data-pb-block="paragraph" class="text-sm/6">
              <div data-pb-rich="body">Projects deployed</div>
            </div>
            <div
              data-pb-block="paragraph"
              class="order-first text-3xl font-semibold tracking-tight"
            >
              <div data-pb-rich="body">12m</div>
            </div>
          </div>
        </dl>
      </div>

      <!-- CTA -->
      <div
        data-pb-block="group"
        data-pb-pattern="home-cta"
        data-pb-tag="tag"
        data-pb-children
        class="bg-gray-900 relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-40 lg:px-8"
      >
        <svg
          aria-hidden="true"
          class="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
        >
          <defs>
            <pattern
              id="1d4240dd-898f-445f-932d-e2872fd12de3"
              width="200"
              height="200"
              x="50%"
              y="0"
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y="0" class="overflow-visible fill-gray-800/20">
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              stroke-width="0"
            />
          </svg>
          <rect
            width="100%"
            height="100%"
            fill="url(#1d4240dd-898f-445f-932d-e2872fd12de3)"
            stroke-width="0"
          />
        </svg>
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
        >
          <div
            style="clip-path: polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)"
            class="aspect-1108/632 w-277 flex-none bg-linear-to-r from-[#80caff] to-[#4f46e5] opacity-20"
          ></div>
        </div>
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="mx-auto max-w-2xl text-center"
        >
          <h2
            data-pb-block="heading"
            data-pb-tag="level"
            data-pb-rich="text"
            class="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl"
          >
            Boost your productivity. Start using our app today.
          </h2>
          <div
            data-pb-block="paragraph"
            class="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-300"
          >
            <div data-pb-rich="body">
              Incididunt sint fugiat pariatur cupidatat consectetur sit cillum anim id veniam aliqua
              proident excepteur commodo do ea.
            </div>
          </div>
          <div
            data-pb-block="group"
            data-pb-tag="tag"
            data-pb-children
            class="mt-10 flex items-center justify-center gap-x-6"
          >
            <a
              data-pb-block="button"
              data-pb-rich="label"
              data-pb-link="url"
              href="#"
              class="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              ><script type="application/json" data-pb-settings>
                { "style": "link" }
              </script>
              Get started</a
            >
            <a
              data-pb-block="button"
              data-pb-rich="label"
              data-pb-link="url"
              href="#"
              class="text-sm/6 font-semibold text-white"
              ><script type="application/json" data-pb-settings>
                { "style": "link" }
              </script>
              Learn more <span aria-hidden="true">→</span></a
            >
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer
      data-pb-block="group"
      data-pb-pattern="home-footer"
      data-pb-tag="tag"
      data-pb-children
      class="bg-gray-900 mx-auto max-w-7xl px-6 lg:px-8"
    >
      <div
        data-pb-block="group"
        data-pb-tag="tag"
        data-pb-children
        class="border-t border-white/10 py-12 md:flex md:items-center md:justify-between"
      >
        <div
          data-pb-block="group"
          data-pb-tag="tag"
          data-pb-children
          class="flex justify-center gap-x-6 md:order-2"
        >
          <a
            data-pb-block="button"
            data-pb-rich="label"
            data-pb-link="url"
            href="#"
            class="text-gray-400 hover:text-white"
            ><script type="application/json" data-pb-settings>
              { "style": "link" }
            </script>
            <span class="sr-only">Facebook</span
            ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6">
              <path
                d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
              /></svg
          ></a>
          <a
            data-pb-block="button"
            data-pb-rich="label"
            data-pb-link="url"
            href="#"
            class="text-gray-400 hover:text-white"
            ><script type="application/json" data-pb-settings>
              { "style": "link" }
            </script>
            <span class="sr-only">Instagram</span
            ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6">
              <path
                d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"
              /></svg
          ></a>
          <a
            data-pb-block="button"
            data-pb-rich="label"
            data-pb-link="url"
            href="#"
            class="text-gray-400 hover:text-white"
            ><script type="application/json" data-pb-settings>
              { "style": "link" }
            </script>
            <span class="sr-only">X</span
            ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6">
              <path
                d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
              /></svg
          ></a>
          <a
            data-pb-block="button"
            data-pb-rich="label"
            data-pb-link="url"
            href="#"
            class="text-gray-400 hover:text-white"
            ><script type="application/json" data-pb-settings>
              { "style": "link" }
            </script>
            <span class="sr-only">GitHub</span
            ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              /></svg
          ></a>
          <a
            data-pb-block="button"
            data-pb-rich="label"
            data-pb-link="url"
            href="#"
            class="text-gray-400 hover:text-white"
            ><script type="application/json" data-pb-settings>
              { "style": "link" }
            </script>
            <span class="sr-only">YouTube</span
            ><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-6">
              <path
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              /></svg
          ></a>
        </div>
        <div
          data-pb-block="paragraph"
          class="mt-8 text-center text-sm/6 text-gray-400 md:order-1 md:mt-0"
        >
          <div data-pb-rich="body">© 2024 Your Company, Inc. All rights reserved.</div>
        </div>
      </div>
    </footer>
  </div>
</div>
```
