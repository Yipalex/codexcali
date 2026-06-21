import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { normalizePageId } from "./paths.js";
import { getPagePaths, readScene, readSelection, writeScene } from "./storage.js";
import type { CodexcaliElementData, CodexcaliScene, ExcalidrawElement, InsertImageInput } from "./types.js";

function now(): number {
  return Date.now();
}

function seed(): number {
  return Math.floor(Math.random() * 2_147_483_647);
}

function baseElement(partial: Partial<ExcalidrawElement>): ExcalidrawElement {
  const timestamp = now();
  return {
    id: partial.id ?? nanoid(),
    type: partial.type ?? "rectangle",
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 320,
    height: partial.height ?? 240,
    angle: partial.angle ?? 0,
    strokeColor: partial.strokeColor ?? "#2f6f73",
    backgroundColor: partial.backgroundColor ?? "transparent",
    fillStyle: partial.fillStyle ?? "hachure",
    strokeWidth: partial.strokeWidth ?? 2,
    strokeStyle: partial.strokeStyle ?? "solid",
    roughness: partial.roughness ?? 1,
    opacity: partial.opacity ?? 100,
    groupIds: partial.groupIds ?? [],
    frameId: partial.frameId ?? null,
    seed: partial.seed ?? seed(),
    version: partial.version ?? 1,
    versionNonce: partial.versionNonce ?? seed(),
    isDeleted: partial.isDeleted ?? false,
    boundElements: partial.boundElements ?? null,
    updated: partial.updated ?? timestamp,
    link: partial.link ?? null,
    locked: partial.locked ?? false,
    ...partial
  };
}

export function isCodexcaliHolder(element: ExcalidrawElement | undefined): boolean {
  return element?.customData?.codexcali?.kind === "ai-image-holder" && !element.isDeleted;
}

export function createHolderElement(input: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  prompt?: string;
}): ExcalidrawElement {
  return baseElement({
    type: "rectangle",
    x: input.x ?? 120,
    y: input.y ?? 120,
    width: input.width ?? 512,
    height: input.height ?? 512,
    backgroundColor: "#d8f3ef",
    strokeColor: "#2f6f73",
    fillStyle: "hachure",
    roundness: { type: 3 },
    customData: {
      codexcali: {
        kind: "ai-image-holder",
        prompt: input.prompt,
        status: "empty"
      }
    }
  });
}

export async function addImageHolder(input: {
  pageId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  prompt?: string;
}, canvasDir?: string): Promise<{ pageId: string; holder: ExcalidrawElement; scene: CodexcaliScene }> {
  const pageId = normalizePageId(input.pageId);
  const scene = await readScene(pageId, canvasDir);
  const holder = createHolderElement(input);
  scene.elements = [...scene.elements, holder];
  await writeScene(scene, pageId, canvasDir);
  return { pageId, holder, scene };
}

function parseImageInput(input: InsertImageInput): { bytes: Buffer; mimeType: string; extension: string } {
  if (input.dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(input.dataUrl);
    if (!match) throw new Error("dataUrl must be a base64 data URL");
    const mimeType = match[1];
    return { bytes: Buffer.from(match[2], "base64"), mimeType, extension: extensionForMime(mimeType) };
  }
  if (input.base64) {
    const mimeType = input.mimeType ?? "image/png";
    return { bytes: Buffer.from(input.base64, "base64"), mimeType, extension: extensionForMime(mimeType) };
  }
  throw new Error("Provide imagePath, dataUrl, or base64");
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".png";
}

async function loadImage(input: InsertImageInput): Promise<{ bytes: Buffer; mimeType: string; extension: string }> {
  if (input.imagePath) {
    const bytes = await fs.readFile(path.resolve(input.imagePath));
    const ext = path.extname(input.imagePath).toLowerCase();
    const mimeType = input.mimeType ?? (ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png");
    return { bytes, mimeType, extension: ext || extensionForMime(mimeType) };
  }
  return parseImageInput(input);
}

export async function insertImage(input: InsertImageInput, canvasDir?: string): Promise<{
  pageId: string;
  image: ExcalidrawElement;
  assetPath: string;
  scene: CodexcaliScene;
}> {
  const pageId = normalizePageId(input.pageId);
  const scene = await readScene(pageId, canvasDir);
  const paths = getPagePaths(pageId, canvasDir);
  await fs.mkdir(paths.assetsDir, { recursive: true });

  const loaded = await loadImage(input);
  const fileId = nanoid();
  const fileName = input.fileName ?? `${fileId}${loaded.extension}`;
  const assetPath = path.join(paths.assetsDir, path.basename(fileName));
  await fs.writeFile(assetPath, loaded.bytes);
  const dataURL = `data:${loaded.mimeType};base64,${loaded.bytes.toString("base64")}`;

  const holder = input.holderId ? scene.elements.find((element) => element.id === input.holderId) : undefined;
  const width = input.width ?? holder?.width ?? 512;
  const height = input.height ?? holder?.height ?? 512;
  const x = input.x ?? holder?.x ?? 120;
  const y = input.y ?? holder?.y ?? 120;
  const codexcali: CodexcaliElementData = {
    kind: "generated-image",
    prompt: input.prompt ?? holder?.customData?.codexcali?.prompt,
    status: "filled",
    assetPath,
    sourceElementId: input.sourceElementId ?? holder?.id
  };

  const image = baseElement({
    type: "image",
    x,
    y,
    width,
    height,
    backgroundColor: "transparent",
    strokeColor: "transparent",
    fileId,
    status: "saved",
    scale: [1, 1],
    customData: { codexcali }
  });

  scene.files[fileId] = {
    id: fileId,
    mimeType: loaded.mimeType,
    dataURL,
    created: now(),
    lastRetrieved: now()
  };

  if (holder && isCodexcaliHolder(holder)) {
    holder.isDeleted = true;
    holder.version += 1;
    holder.updated = now();
  }

  scene.elements = [...scene.elements, image];
  await writeScene(scene, pageId, canvasDir);
  return { pageId, image, assetPath, scene };
}

export async function getSelection(pageId?: string, canvasDir?: string): Promise<{
  pageId: string;
  selectedElementIds: string[];
  selectedElements: ExcalidrawElement[];
  selectedHolder: ExcalidrawElement | null;
  pagePath: string;
  assetsDir: string;
}> {
  const storedSelection = await readSelection(canvasDir);
  const resolvedPageId = normalizePageId(pageId ?? storedSelection?.pageId);
  const scene = await readScene(resolvedPageId, canvasDir);
  const selectedElementIds = storedSelection?.pageId === resolvedPageId ? storedSelection.selectedElementIds : [];
  const selectedElements = scene.elements.filter((element) => selectedElementIds.includes(element.id) && !element.isDeleted);
  const selectedHolder = selectedElements.find(isCodexcaliHolder) ?? null;
  const paths = getPagePaths(resolvedPageId, canvasDir);
  return {
    pageId: resolvedPageId,
    selectedElementIds,
    selectedElements,
    selectedHolder,
    pagePath: paths.scenePath,
    assetsDir: paths.assetsDir
  };
}

export async function placeCleanEditBesideOriginal(input: InsertImageInput, canvasDir?: string) {
  const pageId = normalizePageId(input.pageId);
  const selection = await getSelection(pageId, canvasDir);
  const original = selection.selectedElements.find((element) => element.type === "image") ?? selection.selectedElements[0];
  const gap = 48;
  return insertImage({
    ...input,
    pageId,
    x: input.x ?? (original ? original.x + original.width + gap : 120),
    y: input.y ?? (original ? original.y : 120),
    width: input.width ?? original?.width ?? 512,
    height: input.height ?? original?.height ?? 512,
    sourceElementId: original?.id
  }, canvasDir);
}
