import path from "node:path";

export const DEFAULT_PAGE_ID = "default";
export const DEFAULT_PORT = 43218;

export function getProjectDir(explicit?: string): string {
  return path.resolve(explicit ?? process.env.CODEXCALI_PROJECT_DIR ?? process.cwd());
}

export function getCanvasDir(projectDir = getProjectDir()): string {
  return path.resolve(process.env.CODEXCALI_CANVAS_DIR ?? path.join(projectDir, "codexcali"));
}

export function getPort(): number {
  const parsed = Number(process.env.CODEXCALI_PORT ?? DEFAULT_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function normalizePageId(pageId?: string): string {
  const raw = (pageId ?? DEFAULT_PAGE_ID).trim();
  const safe = raw.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return safe || DEFAULT_PAGE_ID;
}
