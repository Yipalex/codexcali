import "@excalidraw/excalidraw/index.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";
import "./styles.css";

type SceneResponse = {
  pageId: string;
  scene: {
    elements: unknown[];
    appState: Record<string, unknown>;
    files: Record<string, unknown>;
  };
  pagePath: string;
  assetsDir: string;
};

type ExcalidrawApi = any;
const CodexcaliExcalidraw = Excalidraw as React.ComponentType<any>;

function getPageId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("page") || "default";
}

function App() {
  const pageId = useMemo(getPageId, []);
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastLocalSave = useRef(0);
  const [scene, setScene] = useState<SceneResponse | null>(null);
  const [status, setStatus] = useState("Loading");

  const loadScene = useCallback(async (mode: "initial" | "poll" = "initial") => {
    const response = await fetch(`/api/page/${encodeURIComponent(pageId)}`);
    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as SceneResponse;
    setScene(data);
    if (mode === "poll" && apiRef.current && Date.now() - lastLocalSave.current > 1200) {
      apiRef.current.updateScene({
        elements: data.scene.elements,
        appState: data.scene.appState,
        files: data.scene.files
      });
    }
    setStatus("Saved");
  }, [pageId]);

  useEffect(() => {
    void loadScene();
    const interval = window.setInterval(() => {
      void loadScene("poll").catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [loadScene]);

  const saveScene = useCallback((elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setStatus("Saving");
    saveTimer.current = window.setTimeout(async () => {
      lastLocalSave.current = Date.now();
      const cleanAppState = { ...appState };
      delete cleanAppState.collaborators;
      await fetch(`/api/page/${encodeURIComponent(pageId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: {
            type: "excalidraw",
            version: 2,
            source: "codexcali",
            elements,
            appState: cleanAppState,
            files
          }
        })
      });
      setStatus("Saved");
    }, 450);
  }, [pageId]);

  const syncSelection = useCallback((appState: Record<string, unknown>) => {
    const selected = appState.selectedElementIds as Record<string, boolean> | undefined;
    const selectedElementIds = Object.entries(selected ?? {})
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
    void fetch("/api/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, selectedElementIds })
    });
  }, [pageId]);

  const createHolder = useCallback(async () => {
    const response = await fetch("/api/holder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, width: 512, height: 512 })
    });
    if (!response.ok) {
      setStatus("Holder failed");
      return;
    }
    await loadScene("poll");
  }, [loadScene, pageId]);

  if (!scene) {
    return <div className="loading">Loading Codexcali...</div>;
  }

  return (
    <div className="appShell">
      <header className="toolbar">
        <div className="brand">
          <strong>Codexcali</strong>
          <span>{scene.pageId}</span>
        </div>
        <div className="actions">
          <button type="button" onClick={createHolder}>AI holder</button>
          <span className="status">{status}</span>
        </div>
      </header>
      <main className="canvas">
        <CodexcaliExcalidraw
          excalidrawAPI={(api: ExcalidrawApi) => {
            apiRef.current = api;
          }}
          initialData={{
            elements: scene.scene.elements,
            appState: scene.scene.appState,
            files: scene.scene.files
          }}
          onChange={(elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
            syncSelection(appState);
            saveScene(elements, appState, files);
          }}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
