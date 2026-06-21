import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addImageHolder, getSelection, insertImage, isCodexcaliHolder, placeCleanEditBesideOriginal } from "../src/core/scene.js";
import { getPagePaths, readScene, writeSelection } from "../src/core/storage.js";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "codexcali-"));
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("Codexcali storage and scene operations", () => {
  it("creates a persistent page scene", async () => {
    const scene = await readScene("demo", tmp);
    const paths = getPagePaths("demo", tmp);

    expect(scene.type).toBe("excalidraw");
    await expect(fs.access(paths.scenePath)).resolves.toBeUndefined();
    await expect(fs.access(paths.assetsDir)).resolves.toBeUndefined();
  });

  it("creates and recognizes an AI image holder", async () => {
    const result = await addImageHolder({ pageId: "demo", width: 640, height: 360, prompt: "a clean product render" }, tmp);

    expect(result.holder.width).toBe(640);
    expect(result.holder.height).toBe(360);
    expect(isCodexcaliHolder(result.holder)).toBe(true);

    const scene = await readScene("demo", tmp);
    expect(scene.elements).toHaveLength(1);
    expect(scene.elements[0].customData?.codexcali?.status).toBe("empty");
  });

  it("inserts an image into a holder and writes the asset", async () => {
    const holder = await addImageHolder({ pageId: "demo", width: 320, height: 240 }, tmp);
    const png = Buffer.from("iVBORw0KGgo=", "base64").toString("base64");

    const result = await insertImage({
      pageId: "demo",
      base64: png,
      mimeType: "image/png",
      holderId: holder.holder.id,
      fileName: "sample.png"
    }, tmp);

    expect(result.image.type).toBe("image");
    expect(result.image.width).toBe(320);
    await expect(fs.access(result.assetPath)).resolves.toBeUndefined();

    const scene = await readScene("demo", tmp);
    expect(Object.keys(scene.files)).toHaveLength(1);
    expect(scene.elements.find((element) => element.id === holder.holder.id)?.isDeleted).toBe(true);
  });

  it("reads selected holder state", async () => {
    const holder = await addImageHolder({ pageId: "demo" }, tmp);
    await writeSelection({ pageId: "demo", selectedElementIds: [holder.holder.id], updatedAt: Date.now() }, tmp);

    const selection = await getSelection("demo", tmp);

    expect(selection.selectedElementIds).toEqual([holder.holder.id]);
    expect(selection.selectedHolder?.id).toBe(holder.holder.id);
    expect(selection.assetsDir).toContain(path.join("pages", "demo", "assets"));
  });

  it("places a clean edit beside the selected original image", async () => {
    const png = Buffer.from("iVBORw0KGgo=", "base64").toString("base64");
    const original = await insertImage({
      pageId: "demo",
      base64: png,
      mimeType: "image/png",
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      fileName: "original.png"
    }, tmp);
    await writeSelection({ pageId: "demo", selectedElementIds: [original.image.id], updatedAt: Date.now() }, tmp);

    const clean = await placeCleanEditBesideOriginal({
      pageId: "demo",
      base64: png,
      mimeType: "image/png",
      fileName: "clean.png"
    }, tmp);

    expect(clean.image.x).toBe(158);
    expect(clean.image.y).toBe(20);
    expect(clean.image.customData?.codexcali?.sourceElementId).toBe(original.image.id);
  });
});
