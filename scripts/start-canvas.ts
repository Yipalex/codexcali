import { startCanvasServer } from "../src/server/app.js";

const started = startCanvasServer();
console.log(started.url);
