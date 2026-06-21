import { startCanvasServer } from "./app.js";

const started = startCanvasServer();
console.log(`Codexcali canvas: ${started.url}`);
console.log(`Project: ${started.projectDir}`);
console.log(`Canvas data: ${started.canvasDir}`);
