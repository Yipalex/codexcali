import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { getPort, normalizePageId } from "../src/core/paths.js";
import { addImageHolder, getSelection, insertImage, placeCleanEditBesideOriginal } from "../src/core/scene.js";
import { readScene, writeScene } from "../src/core/storage.js";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const tools = [
  {
    name: "codexcali:open-canvas",
    description: "Start or reuse the local Codexcali Excalidraw canvas server and return its URL.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page id to open. Defaults to default." }
      }
    }
  },
  {
    name: "codexcali:get-selection",
    description: "Read the current Codexcali page selection, selected holder, page path, and assets directory.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string" }
      }
    }
  },
  {
    name: "codexcali:create-image-holder",
    description: "Create an AI image holder rectangle in the Codexcali canvas.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        prompt: { type: "string" }
      }
    }
  },
  {
    name: "codexcali:insert-image",
    description: "Save an image into the local page assets directory and insert it into a holder or at coordinates.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        imagePath: { type: "string" },
        dataUrl: { type: "string" },
        base64: { type: "string" },
        mimeType: { type: "string" },
        fileName: { type: "string" },
        holderId: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        prompt: { type: "string" }
      }
    }
  },
  {
    name: "codexcali:save-page",
    description: "Force save the current Codexcali page scene.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string" }
      }
    }
  },
  {
    name: "codexcali:place-clean-edit-beside-original",
    description: "Save a clean revised image and place it beside the selected original image.",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        imagePath: { type: "string" },
        dataUrl: { type: "string" },
        base64: { type: "string" },
        mimeType: { type: "string" },
        fileName: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        prompt: { type: "string" }
      }
    }
  }
];

let canvasProcess: ReturnType<typeof spawn> | null = null;

function requestHealth(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureCanvasServer(): Promise<string> {
  const port = getPort();
  if (await requestHealth(port)) return `http://127.0.0.1:${port}/`;

  const serverEntry = path.resolve("dist/node/src/server/start.js");
  canvasProcess = spawn(process.execPath, [serverEntry], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
    detached: true
  });
  canvasProcess.unref();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (await requestHealth(port)) return `http://127.0.0.1:${port}/`;
  }
  throw new Error("Codexcali canvas server did not become healthy");
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  if (name === "codexcali:open-canvas") {
    const url = await ensureCanvasServer();
    const pageId = normalizePageId(String(args.pageId ?? "default"));
    return { url: `${url}?page=${encodeURIComponent(pageId)}` };
  }
  if (name === "codexcali:get-selection") {
    return getSelection(args.pageId ? String(args.pageId) : undefined);
  }
  if (name === "codexcali:create-image-holder") {
    return addImageHolder(args as Parameters<typeof addImageHolder>[0]);
  }
  if (name === "codexcali:insert-image") {
    return insertImage(args as Parameters<typeof insertImage>[0]);
  }
  if (name === "codexcali:save-page") {
    const pageId = normalizePageId(String(args.pageId ?? "default"));
    const scene = await readScene(pageId);
    const paths = await writeScene(scene, pageId);
    return { ok: true, pageId, pagePath: paths.scenePath, assetsDir: paths.assetsDir };
  }
  if (name === "codexcali:place-clean-edit-beside-original") {
    return placeCleanEditBesideOriginal(args as Parameters<typeof placeCleanEditBesideOriginal>[0]);
  }
  throw new Error(`Unknown tool: ${name}`);
}

function send(message: unknown) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(request: JsonRpcRequest) {
  if (!request.method) return;
  try {
    if (request.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "codexcali", version: "0.1.0" }
        }
      });
      return;
    }
    if (request.method === "tools/list") {
      send({ jsonrpc: "2.0", id: request.id, result: { tools } });
      return;
    }
    if (request.method === "tools/call") {
      const params = request.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await callTool(name, args);
      send({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        }
      });
      return;
    }
    if (request.id !== undefined) {
      send({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: `Method not found: ${request.method}` } });
    }
  } catch (error) {
    send({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32000, message: error instanceof Error ? error.message : String(error) }
    });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) {
      void handle(JSON.parse(line) as JsonRpcRequest);
    }
    index = buffer.indexOf("\n");
  }
});
