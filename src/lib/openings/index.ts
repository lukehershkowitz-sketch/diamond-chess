export interface Opening {
  eco: string;
  name: string;
}

type Table = Record<string, [string, string]>;
let table: Promise<Table> | null = null;

/** Lazily loads the opening table (~0.5 MB, split into its own chunk). */
export function loadOpenings(): Promise<Table> {
  table ??= import("./openings.json").then((m) => m.default as unknown as Table);
  return table;
}

export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function lookupOpening(t: Table, fen: string): Opening | null {
  const hit = t[positionKey(fen)];
  return hit ? { eco: hit[0], name: hit[1] } : null;
}
