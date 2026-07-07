// media-store — OPFS persistence (story #365). Runs against the real OPFS
// in Chromium; the /media/* service worker itself is exercised end-to-end
// in the demo (playwright verification), not here — vitest pages aren't SW-
// controlled.

import { afterEach, describe, expect, test } from "vitest";
import {
  MEDIA_PREFIX,
  deleteMedia,
  getMedia,
  listMedia,
  mediaStoreSupported,
  putMedia,
} from "../src/media-store";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe("media store (OPFS)", () => {
  afterEach(async () => {
    for (const name of await listMedia()) await deleteMedia(name);
  });

  test("the environment supports the store (OPFS + subtle crypto)", () => {
    expect(mediaStoreSupported()).toBe(true);
  });

  test("put → get round-trips bytes; the URL is /media/<hash>.<ext>", async () => {
    const blob = new Blob([PNG_BYTES], { type: "image/png" });
    const { url, name } = await putMedia(blob);
    expect(url).toBe(MEDIA_PREFIX + name);
    expect(name).toMatch(/^[0-9a-f]{24}\.png$/);
    const file = await getMedia(name);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(PNG_BYTES);
  });

  test("content-hashed names: same bytes → same URL (idempotent), different bytes → different URL", async () => {
    const a1 = await putMedia(new Blob([PNG_BYTES], { type: "image/png" }));
    const a2 = await putMedia(new Blob([PNG_BYTES], { type: "image/png" }));
    const b = await putMedia(new Blob([new Uint8Array([9, 9, 9])], { type: "image/png" }));
    expect(a1.url).toBe(a2.url);
    expect(b.url).not.toBe(a1.url);
    expect((await listMedia()).length).toBe(2);
  });

  test("extension falls back to the file name, then bin; hostile names never traverse", async () => {
    const fromName = await putMedia(new Blob([PNG_BYTES]), "shot.WEBP");
    expect(fromName.name.endsWith(".webp")).toBe(true);
    const unknown = await putMedia(new Blob([PNG_BYTES]), "weird.name.with/../slash");
    expect(unknown.name.endsWith(".bin")).toBe(true); // "…/slash" is not a clean extension
    const none = await putMedia(new Blob([new Uint8Array([5])]));
    expect(none.name.endsWith(".bin")).toBe(true);
  });

  test("delete removes; getMedia on a missing name throws", async () => {
    const { name } = await putMedia(new Blob([PNG_BYTES], { type: "image/png" }));
    expect(await deleteMedia(name)).toBe(true);
    expect(await deleteMedia(name)).toBe(false);
    await expect(getMedia(name)).rejects.toThrow();
    expect(await listMedia()).toEqual([]);
  });
});
