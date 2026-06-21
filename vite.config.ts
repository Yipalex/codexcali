import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiPort = Number(process.env.CODEXCALI_PORT ?? 43218);

export default defineConfig({
  plugins: [react()],
  root: "src/client",
  publicDir: false,
  build: {
    outDir: "../../dist/public",
    emptyOutDir: true
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.CODEXCALI_DEV_PORT ?? 5173),
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
      "/assets": `http://127.0.0.1:${apiPort}`
    }
  }
});
