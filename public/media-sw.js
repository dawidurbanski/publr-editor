// media-sw.js — serves /media/<name> from the OPFS media directory (story
// #365; see src/media-store.ts for the writer side). A classic service
// worker on purpose: no bundling, no imports — the file ships verbatim from
// public/. Names are content-hashed and immutable, so responses carry a
// long-lived cache header.
//
// Range support matters here: <video>/<audio> seeking issues single-range
// requests, and a 200-only server breaks scrubbing in some browsers.

const MEDIA_PREFIX = "/media/";
const DIR = "media";

// extension → Content-Type — keep in sync with EXT_FOR_TYPE in
// src/media-store.ts (the writer chooses the extension from this same map).
const TYPE_FOR_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  pdf: "application/pdf",
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(MEDIA_PREFIX)) return;
  event.respondWith(serve(event.request, url.pathname.slice(MEDIA_PREFIX.length)));
});

async function serve(request, name) {
  // one path segment only — no traversal, no nested lookups
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return new Response("Bad media name", { status: 400 });
  let file;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(DIR);
    const handle = await dir.getFileHandle(name);
    file = await handle.getFile();
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const headers = {
    "Content-Type": TYPE_FOR_EXT[ext] || "application/octet-stream",
    "Accept-Ranges": "bytes",
    // content-hashed name = immutable content
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = parseRange(request.headers.get("range"), file.size);
  if (range === null) {
    return new Response(file, {
      status: 200,
      headers: { ...headers, "Content-Length": String(file.size) },
    });
  }
  if (range === false) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${file.size}` },
    });
  }
  const [start, end] = range;
  return new Response(file.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${file.size}`,
    },
  });
}

// "bytes=a-b" | "bytes=a-" | "bytes=-n" → [start, end] inclusive;
// null = no/unsupported range header (serve 200), false = unsatisfiable.
function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || size === 0) return null;
  const [, a, b] = m;
  if (a === "" && b === "") return null;
  if (a === "") {
    // suffix range: last n bytes
    const n = Math.min(Number(b), size);
    return n === 0 ? false : [size - n, size - 1];
  }
  const start = Number(a);
  if (start >= size) return false;
  const end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  return start > end ? false : [start, end];
}
