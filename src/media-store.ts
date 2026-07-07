// media-store.ts — in-browser media persistence on the Origin Private File
// System (story #365). Uploaded blobs live in the OPFS `media/` directory
// under content-hashed names; the companion service worker (public/
// media-sw.js) serves them at same-origin /media/<name> URLs, so the
// model's src stays an ORDINARY URL — the wire contract never learns about
// OPFS, and a CMS can later take over the same /media/* paths server-side
// by ingesting the blobs on save.
//
// Content-hash names make writes idempotent (re-uploading the same file is
// a no-op) and immutable (a URL never changes meaning — safe to cache).

/** URL prefix the service worker owns. */
export const MEDIA_PREFIX = "/media/";

const DIR = "media";

// extension → Content-Type, mirrored by the service worker (which cannot
// import modules from the bundle — keep the two maps in sync).
const EXT_FOR_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

/** OPFS + crypto available — the store can work at all. */
export function mediaStoreSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.storage?.getDirectory &&
    !!globalThis.crypto?.subtle
  );
}

async function mediaDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create: true });
}

function extensionFor(blob: Blob, fallbackName?: string): string {
  const byType = EXT_FOR_TYPE[blob.type];
  if (byType) return byType;
  const dot = fallbackName?.lastIndexOf(".") ?? -1;
  const byName = dot > 0 ? fallbackName!.slice(dot + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,8}$/.test(byName) ? byName : "bin";
}

/**
 * Store a blob and return its stable same-origin URL (/media/<hash>.<ext>).
 * Idempotent: identical content lands on the identical URL.
 */
export async function putMedia(blob: Blob, name?: string): Promise<{ url: string; name: string }> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hash = [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const fileName = `${hash}.${extensionFor(blob, name)}`;
  const dir = await mediaDir();
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return { url: MEDIA_PREFIX + fileName, name: fileName };
}

/** Read one stored file back (throws when absent). */
export async function getMedia(name: string): Promise<File> {
  const dir = await mediaDir();
  const handle = await dir.getFileHandle(name);
  return handle.getFile();
}

/** All stored file names (unordered). */
export async function listMedia(): Promise<string[]> {
  const dir = await mediaDir();
  const names: string[] = [];
  for await (const key of dir.keys()) names.push(key);
  return names;
}

/** Remove one stored file; true when it existed. */
export async function deleteMedia(name: string): Promise<boolean> {
  const dir = await mediaDir();
  try {
    await dir.removeEntry(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register the /media/* service worker (public/media-sw.js). Safe to call
 * unconditionally: resolves false when SW/OPFS are unavailable (insecure
 * context, unsupported browser) — callers degrade to URL-only media input.
 */
export async function registerMediaWorker(
  scriptUrl = "/media-sw.js",
): Promise<ServiceWorkerRegistration | false> {
  if (!mediaStoreSupported() || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.register(scriptUrl);
    // The first page load isn't controlled until the worker activates and
    // claims clients — wait so freshly-uploaded media resolves immediately.
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return false;
  }
}
