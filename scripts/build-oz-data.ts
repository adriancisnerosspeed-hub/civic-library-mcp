/**
 * Regenerates data/oz-tracts.json from the U.S. Treasury CDFI Fund's official
 * list of Designated Qualified Opportunity Zones (Round 1, authorized by the
 * Tax Cuts and Jobs Act of 2017). Run with: npm run build:oz
 *
 * OZ designations are keyed to 2010 census tract GEOIDs — the runtime resolves
 * a location to its 2010 tract before matching against this file.
 */
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://www.cdfifund.gov/sites/cdfi/files/documents/designated-qozs.12.14.18.xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/oz-tracts.json");

async function main() {
  console.error(`Downloading CDFI OZ list from ${SOURCE_URL} …`);
  const res = await fetch(SOURCE_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: null,
  });

  // Column layout (data starts after a multi-row header):
  //   [0]=State  [1]=County  [2]=Census Tract Number (11-digit GEOID)  [3]=Tract Type
  const tracts: Record<string, "LIC" | "NLC"> = {};
  for (const r of rows) {
    const geoid = r[2] != null ? String(r[2]).trim() : "";
    if (!/^\d{11}$/.test(geoid)) continue;
    const type = String(r[3] ?? "").toLowerCase().includes("contiguous")
      ? "NLC" // Non-LIC Contiguous tract
      : "LIC"; // Low-Income Community
    tracts[geoid] = type;
  }

  const count = Object.keys(tracts).length;
  if (count < 8000) {
    throw new Error(`Sanity check failed: parsed only ${count} tracts (expected ~8764)`);
  }

  const out = {
    round: "1.0",
    authority: "Tax Cuts and Jobs Act of 2017 (26 U.S.C. § 1400Z-1)",
    source: "U.S. Treasury CDFI Fund — Designated Qualified Opportunity Zones",
    sourceUrl: SOURCE_URL,
    sourceUpdated: "2018-12-14",
    tractVintage: "2010",
    count,
    tracts,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.error(`Wrote ${count} OZ tracts to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
