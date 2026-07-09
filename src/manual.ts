// Manual-test harness (manual.html): a collapsible sidebar of markdown-
// described tests beside the FULL demo shell in an iframe. Each test is one
// file under tests/manual/<group>/<name>.md — frontmatter title, prose plus a
// "- [ ]" checklist, and a ```html fence that is the fixture. Selecting a
// test points the iframe at /?fixture=<group>/<name>; demo.ts fetches the
// same markdown and seeds the editor from its fence, so every selection is a
// pristine editor over exactly the fixture, with all of the real chrome.
//
// Plain TS, no PublrJS islands — same stance as fields-demo.ts: this is host
// tooling, not a framework showcase. Dev-only: it leans on the dev server
// serving tests/manual/*.md raw.

import "./manual.css";

interface ManualTest {
  id: string; // "<group>/<name>" — the fixture id, the URL hash, storage keys
  group: string;
  title: string;
  doc: string; // markdown body with frontmatter and the fixture fence removed
  fixture: string; // the ```html fence contents — what the demo shell loads
}

// Every markdown file under tests/manual/, inlined at build time. Adding a
// file IS the registration — the sidebar derives everything from this glob.
const files = import.meta.glob("../tests/manual/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const GROUP_ORDER = ["blocks", "features", "issues"];
const groupRank = (g: string) => {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? GROUP_ORDER.length : i;
};

const tests: ManualTest[] = Object.entries(files)
  .map(([path, md]): ManualTest | null => {
    const id = path.replace(/^.*\/tests\/manual\//, "").replace(/\.md$/, "");
    const slash = id.indexOf("/");
    if (slash === -1 || id.endsWith("/README")) return null; // README.md documents the format, it is not a test
    const group = id.slice(0, slash);
    let body = md;
    let title = id.slice(slash + 1);
    const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(body);
    if (fm) {
      body = body.slice(fm[0].length);
      const t = /^title:\s*(.+)$/m.exec(fm[1]);
      if (t) title = t[1].trim();
    }
    const fence = /^```html\r?\n([\s\S]*?)^```[ \t]*$/m.exec(body);
    return {
      id,
      group,
      title,
      doc: (fence ? body.replace(fence[0], "") : body).trim(),
      fixture: fence ? fence[1].trimEnd() : "",
    };
  })
  .filter((t): t is ManualTest => t !== null)
  .sort(
    (a, b) =>
      groupRank(a.group) - groupRank(b.group) ||
      a.group.localeCompare(b.group) ||
      a.title.localeCompare(b.title),
  );

// --- a markdown renderer sized to the test-doc format -----------------------
// Headings, paragraphs, bullets, "- [ ]" checklists (interactive), fenced
// code, and inline code/bold/italic/links. The docs are ours — this needs to
// cover the authoring format in README.md, not CommonMark.

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:[^)\s"]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );

function renderDoc(test: ManualTest): string {
  const out: string[] = [`<h1>${inline(test.title)}</h1>`];
  let listOpen = false;
  let para: string[] = [];
  let fence: string[] | null = null;
  let check = 0;
  const closeList = () => {
    if (listOpen) out.push("</ul>");
    listOpen = false;
  };
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  for (const line of test.doc.split(/\r?\n/)) {
    if (fence) {
      if (line.trim().startsWith("```")) {
        out.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`);
        fence = null;
      } else fence.push(line);
      continue;
    }
    const t = line.trim();
    if (t.startsWith("```")) {
      flushPara();
      closeList();
      fence = [];
      continue;
    }
    if (!t) {
      flushPara();
      closeList();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      flushPara();
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    const c = /^[-*]\s+\[([ x])\]\s+(.*)$/i.exec(t);
    if (c) {
      flushPara();
      closeList();
      out.push(
        `<label class="check"><input type="checkbox" data-check="${check++}"${
          c[1].toLowerCase() === "x" ? " checked" : ""
        } /><span>${inline(c[2])}</span></label>`,
      );
      continue;
    }
    const b = /^[-*]\s+(.*)$/.exec(t);
    if (b) {
      flushPara();
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inline(b[1])}</li>`);
      continue;
    }
    para.push(t);
  }
  flushPara();
  closeList();
  if (test.fixture)
    out.push(
      `<details><summary>Fixture</summary><pre><code>${esc(test.fixture)}</code></pre></details>`,
    );
  return out.join("");
}

// --- wiring ------------------------------------------------------------------

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const sidebarEl = $("sidebar");
const expandEl = $("sidebar-expand");
const filterEl = $<HTMLInputElement>("test-filter");
const listEl = $("test-list");
const docEl = $("test-doc");
const frameEl = $<HTMLIFrameElement>("frame");
const welcomeEl = $("welcome");
const titleEl = $("current-title");
const reloadEl = $("frame-reload");
const openEl = $<HTMLAnchorElement>("frame-open");

let current: ManualTest | null = null;

function renderList() {
  const q = filterEl.value.trim().toLowerCase();
  const visible = tests.filter(
    (t) => !q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
  );
  const groups = new Map<string, ManualTest[]>();
  for (const t of visible) {
    if (!groups.has(t.group)) groups.set(t.group, []);
    groups.get(t.group)!.push(t);
  }
  listEl.innerHTML =
    [...groups.entries()]
      .map(
        ([group, items]) =>
          `<section class="mb-2">` +
          `<h2 class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">${esc(group)} <span class="font-normal">· ${items.length}</span></h2>` +
          items
            .map(
              (t) =>
                `<a href="#${esc(t.id)}" class="block truncate rounded px-2 py-1.5 ${
                  t.id === current?.id
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-neutral-700 hover:bg-neutral-100"
                }">${inline(t.title)}</a>`,
            )
            .join("") +
          `</section>`,
      )
      .join("") || `<p class="p-2 text-neutral-400">No tests match.</p>`;
}

// Checklist state survives reloads — one localStorage entry per test holding
// the checked indexes. Ticks are worthless if a page refresh eats them.
const checksKey = (id: string) => `pbe-manual-checks:${id}`;

function restoreChecks(test: ManualTest) {
  let stored: number[] = [];
  try {
    const raw = localStorage.getItem(checksKey(test.id));
    if (raw) stored = (JSON.parse(raw) as number[]).filter((n) => typeof n === "number");
  } catch {
    /* corrupt entry — start unchecked */
  }
  for (const box of docEl.querySelectorAll<HTMLInputElement>("input[data-check]"))
    box.checked = stored.includes(Number(box.dataset.check));
}

docEl.addEventListener("change", () => {
  if (!current) return;
  const checked = [...docEl.querySelectorAll<HTMLInputElement>("input[data-check]:checked")].map(
    (b) => Number(b.dataset.check),
  );
  localStorage.setItem(checksKey(current.id), JSON.stringify(checked));
});

// The hash is the router: #<group>/<name>. Fixture URLs stay shareable — the
// same id works standalone as /?fixture=<group>/<name>.
function applyHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  current = tests.find((t) => t.id === id) ?? null;
  renderList();
  document.title = current
    ? `${current.title} — PublrEditor manual tests`
    : "PublrEditor — manual tests";
  if (!current) {
    titleEl.textContent = "No test selected";
    docEl.classList.add("hidden");
    frameEl.classList.add("hidden");
    frameEl.removeAttribute("src");
    welcomeEl.classList.remove("hidden");
    reloadEl.classList.add("hidden");
    openEl.classList.add("hidden");
    return;
  }
  titleEl.textContent = current.title;
  docEl.innerHTML = renderDoc(current);
  restoreChecks(current);
  docEl.classList.remove("hidden");
  docEl.scrollTop = 0;
  const src = `/?fixture=${encodeURIComponent(current.id)}`;
  if (frameEl.getAttribute("src") !== src) frameEl.src = src;
  frameEl.classList.remove("hidden");
  welcomeEl.classList.add("hidden");
  reloadEl.classList.remove("hidden");
  openEl.href = src;
  openEl.classList.remove("hidden");
}

const SIDEBAR_KEY = "pbe-manual-sidebar";

function setSidebar(open: boolean) {
  sidebarEl.classList.toggle("hidden", !open);
  expandEl.classList.toggle("hidden", open);
  expandEl.classList.toggle("grid", !open);
  localStorage.setItem(SIDEBAR_KEY, open ? "1" : "0");
}

$("sidebar-collapse").addEventListener("click", () => setSidebar(false));
expandEl.addEventListener("click", () => setSidebar(true));
reloadEl.addEventListener("click", () => frameEl.contentWindow?.location.reload());
filterEl.addEventListener("input", renderList);
window.addEventListener("hashchange", applyHash);

$("test-count").textContent = `· ${tests.length}`;
setSidebar(localStorage.getItem(SIDEBAR_KEY) !== "0");
applyHash();
