// Builds src/lib/openings/openings.json from the Lichess chess-openings TSVs (CC0)
// in data/openings/. Keyed by position (first 4 FEN fields) so transpositions match.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const out = {};
for (const f of readdirSync("data/openings").filter((f) => f.endsWith(".tsv")).sort()) {
  const rows = readFileSync(`data/openings/${f}`, "utf8").trim().split("\n").slice(1);
  for (const row of rows) {
    const [eco, name, pgn] = row.split("\t");
    const g = new Chess();
    g.loadPgn(pgn);
    const key = g.fen().split(" ").slice(0, 4).join(" ");
    // Keep the shortest line's name for a position (most general name).
    if (!out[key] || out[key][2] > g.history().length) out[key] = [eco, name, g.history().length];
  }
}
const compact = Object.fromEntries(Object.entries(out).map(([k, [eco, name]]) => [k, [eco, name]]));
writeFileSync("src/lib/openings/openings.json", JSON.stringify(compact));
console.log(`Wrote ${Object.keys(compact).length} positions`);
