import fs from "node:fs/promises";
import path from "node:path";
import { getCanvasDir, normalizePageId } from "./paths.js";
import type { CodexcaliScene, CodexcaliSelectionState, PagePaths } from "./types.js";

export function getPagePaths(pageId?: string, canvasDir = getCanvasDir()): PagePaths {
  const safePageId = normalizePageId(pageId);
  const pageDir = path.join(canvasDir, "pages", safePageId);
  return {
    pageDir,
    scenePath: path.join(pageDir, "codexcali-canvas.excalidraw.json"),
    assetsDir: path.join(pageDir, "assets")
  };
}

export function getSelectionPath(canvasDir = getCanvasDir()): string {
  return path.join(canvasDir, "selection.json");
}

export function createEmptyScene(): CodexcaliScene {
  return {
    type: "excalidraw",
    version: 2,
    source: "codexcali",
    elements: [],
    appState: {
      viewBackgroundColor: "#ffffff",
      currentItemFontFamily: 1
    },
    files: {}
  };
}

export async function ensurePage(pageId?: string, canvasDir = getCanvasDir()): Promise<PagePaths> {
  const paths = getPagePaths(pageId, canvasDir);
  await fs.mkdir(paths.assetsDir, { recursive: true });
  try {
    await fs.access(paths.scenePath);
  } catch {
    await writeScene(createEmptyScene(), pageId, canvasDir);
  }
  return paths;
}

export async function readScene(pageId?: string, canvasDir = getCanvasDir()): Promise<CodexcaliScene> {
  const paths = await ensurePage(pageId, canvasDir);
  const raw = await fs.readFile(paths.scenePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<CodexcaliScene>;
  return {
    ...createEmptyScene(),
    ...parsed,
    elements: Array.isArray(parsed.elements) ? parsed.elements : [],
    appState: parsed.appState ?? {},
    files: parsed.files ?? {}
  };
}

export async function writeScene(scene: CodexcaliScene, pageId?: string, canvasDir = getCanvasDir()): Promise<PagePaths> {
  const paths = getPagePaths(pageId, canvasDir);
  await fs.mkdir(paths.assetsDir, { recursive: true });
  const normalized: CodexcaliScene = {
    ...createEmptyScene(),
    ...scene,
    type: "excalidraw",
    version: scene.version ?? 2,
    source: "codexcali",
    elements: scene.elements ?? [],
    appState: scene.appState ?? {},
    files: scene.files ?? {}
  };
  await fs.writeFile(paths.scenePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return paths;
}

export async function readSelection(canvasDir = getCanvasDir()): Promise<CodexcaliSelectionState | null> {
  try {
    const raw = await fs.readFile(getSelectionPath(canvasDir), "utf8");
    return JSON.parse(raw) as CodexcaliSelectionState;
  } catch {
    return null;
  }
}

export async function writeSelection(selection: CodexcaliSelectionState, canvasDir = getCanvasDir()): Promise<void> {
  await fs.mkdir(canvasDir, { recursive: true });
  await fs.writeFile(getSelectionPath(canvasDir), `${JSON.stringify(selection, null, 2)}\n`, "utf8");
}
