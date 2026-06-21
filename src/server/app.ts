import fs from "node:fs";
import path from "node:path";
import express from "express";
import { z } from "zod";
import { getCanvasDir, getPort, getProjectDir, normalizePageId } from "../core/paths.js";
import { addImageHolder, getSelection, insertImage, placeCleanEditBesideOriginal } from "../core/scene.js";
import { getPagePaths, readScene, writeScene, writeSelection } from "../core/storage.js";

const holderSchema = z.object({
  pageId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  prompt: z.string().optional()
});

const insertImageSchema = z.object({
  pageId: z.string().optional(),
  imagePath: z.string().optional(),
  dataUrl: z.string().optional(),
  base64: z.string().optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  holderId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  prompt: z.string().optional(),
  sourceElementId: z.string().optional()
});

const selectionSchema = z.object({
  pageId: z.string().optional(),
  selectedElementIds: z.array(z.string()).default([])
});

export interface CanvasServerOptions {
  projectDir?: string;
  canvasDir?: string;
}

export function createApp(options: CanvasServerOptions = {}) {
  const projectDir = getProjectDir(options.projectDir);
  const canvasDir = path.resolve(options.canvasDir ?? getCanvasDir(projectDir));
  const app = express();

  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "codexcali", projectDir, canvasDir });
  });

  app.get("/api/page/:pageId", async (req, res, next) => {
    try {
      const pageId = normalizePageId(req.params.pageId);
      const scene = await readScene(pageId, canvasDir);
      const paths = getPagePaths(pageId, canvasDir);
      res.json({ pageId, scene, pagePath: paths.scenePath, assetsDir: paths.assetsDir });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/page/:pageId", async (req, res, next) => {
    try {
      const pageId = normalizePageId(req.params.pageId);
      const paths = await writeScene(req.body.scene, pageId, canvasDir);
      res.json({ ok: true, pageId, pagePath: paths.scenePath, assetsDir: paths.assetsDir });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/selection", async (req, res, next) => {
    try {
      const input = selectionSchema.parse(req.body);
      const pageId = normalizePageId(input.pageId);
      await writeSelection({ pageId, selectedElementIds: input.selectedElementIds, updatedAt: Date.now() }, canvasDir);
      res.json({ ok: true, pageId, selectedElementIds: input.selectedElementIds });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/selection", async (req, res, next) => {
    try {
      res.json(await getSelection(String(req.query.pageId ?? ""), canvasDir));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/holder", async (req, res, next) => {
    try {
      const input = holderSchema.parse(req.body);
      const result = await addImageHolder(input, canvasDir);
      res.json({ ok: true, pageId: result.pageId, holder: result.holder });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/insert-image", async (req, res, next) => {
    try {
      const input = insertImageSchema.parse(req.body);
      const result = await insertImage(input, canvasDir);
      res.json({ ok: true, pageId: result.pageId, image: result.image, assetPath: result.assetPath });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/place-clean-edit-beside-original", async (req, res, next) => {
    try {
      const input = insertImageSchema.parse(req.body);
      const result = await placeCleanEditBesideOriginal(input, canvasDir);
      res.json({ ok: true, pageId: result.pageId, image: result.image, assetPath: result.assetPath });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/save-page", async (req, res, next) => {
    try {
      const pageId = normalizePageId(req.body.pageId);
      const scene = req.body.scene ? req.body.scene : await readScene(pageId, canvasDir);
      const paths = await writeScene(scene, pageId, canvasDir);
      res.json({ ok: true, pageId, pagePath: paths.scenePath, assetsDir: paths.assetsDir });
    } catch (error) {
      next(error);
    }
  });

  app.get("/assets/:pageId/:fileName", (req, res, next) => {
    const pageId = normalizePageId(req.params.pageId);
    const fileName = path.basename(req.params.fileName);
    const assetPath = path.join(getPagePaths(pageId, canvasDir).assetsDir, fileName);
    res.sendFile(assetPath, (error) => {
      if (error) next(error);
    });
  });

  const publicDir = path.resolve("dist/public");
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("must") || message.includes("Provide") ? 400 : 500;
    res.status(status).json({ ok: false, error: message });
  });

  return { app, projectDir, canvasDir };
}

export function startCanvasServer(options: CanvasServerOptions & { port?: number } = {}) {
  const port = options.port ?? getPort();
  const { app, projectDir, canvasDir } = createApp(options);
  const server = app.listen(port, "127.0.0.1");
  return {
    server,
    url: `http://127.0.0.1:${port}/`,
    projectDir,
    canvasDir
  };
}
