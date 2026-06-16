/** Opportunity Zone lookups against the bundled CDFI Fund designation list. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// dist/sources/oz.js -> ../../data ; src/sources/oz.ts -> ../../data (works in both build + dev)
const DATA_PATH = resolve(__dirname, "../../data/oz-tracts.json");

interface OzData {
  round: string;
  authority: string;
  source: string;
  sourceUrl: string;
  sourceUpdated: string;
  tractVintage: string;
  count: number;
  tracts: Record<string, "LIC" | "NLC">;
}

let cache: OzData | null = null;
function load(): OzData {
  if (!cache) cache = JSON.parse(readFileSync(DATA_PATH, "utf8")) as OzData;
  return cache;
}

export interface OzLookup {
  isOz: boolean;
  round: string | null;
  designationType: string | null;
  authority: string;
  tractVintage: string;
  sourceUpdated: string;
}

export function lookupOz(geoid2010: string): OzLookup {
  const data = load();
  const t = data.tracts[geoid2010];
  return {
    isOz: Boolean(t),
    round: t ? data.round : null,
    designationType:
      t === "LIC" ? "Low-Income Community" : t === "NLC" ? "Non-LIC Contiguous" : null,
    authority: data.authority,
    tractVintage: data.tractVintage,
    sourceUpdated: data.sourceUpdated,
  };
}
