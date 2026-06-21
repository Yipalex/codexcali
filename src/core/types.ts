export type CodexcaliHolderStatus = "empty" | "generating" | "filled" | "error";

export interface CodexcaliElementData {
  kind: "ai-image-holder" | "generated-image" | "annotation-source";
  prompt?: string;
  status?: CodexcaliHolderStatus;
  assetPath?: string;
  sourceElementId?: string;
}

export interface ExcalidrawFileRecord {
  id: string;
  mimeType: string;
  dataURL: string;
  created: number;
  lastRetrieved: number;
}

export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: string | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: unknown[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
  roundness?: { type: number };
  customData?: { codexcali?: CodexcaliElementData; [key: string]: unknown };
  fileId?: string;
  status?: "pending" | "saved" | "error";
  scale?: [number, number];
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  containerId?: string | null;
  originalText?: string;
  lineHeight?: number;
}

export interface CodexcaliScene {
  type: "excalidraw";
  version: number;
  source: "codexcali";
  elements: ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: Record<string, ExcalidrawFileRecord>;
}

export interface CodexcaliSelectionState {
  pageId: string;
  selectedElementIds: string[];
  updatedAt: number;
}

export interface PagePaths {
  pageDir: string;
  scenePath: string;
  assetsDir: string;
}

export interface InsertImageInput {
  pageId?: string;
  imagePath?: string;
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
  fileName?: string;
  holderId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  prompt?: string;
  sourceElementId?: string;
}
