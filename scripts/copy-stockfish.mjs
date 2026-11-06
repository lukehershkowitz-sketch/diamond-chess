// Copies the Stockfish WASM builds into public/ so the browser can load them as Web Workers.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
const src = "node_modules/stockfish/bin";
const dest = "public/stockfish";
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(src)) {
  if (f.includes("lite-single") || f.includes("-single")) cpSync(`${src}/${f}`, `${dest}/${f}`);
}
console.log("Copied Stockfish builds to", dest);
