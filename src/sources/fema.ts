/** FEMA National Flood Hazard Layer (NFHL) point query. No API key. */
import { fetchJson } from "../lib/http.js";

// Layer 28 = "Flood Hazard Zones" in the public NFHL MapServer.
const NFHL =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

export interface FloodResult {
  fldZone: string;
  zoneSubtype: string | null;
  sfha: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function floodAtPoint(
  longitude: number,
  latitude: number,
): Promise<FloodResult | null> {
  const url =
    `${NFHL}?geometry=${longitude},${latitude}&geometryType=esriGeometryPoint` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF&returnGeometry=false&f=json`;
  const data = await fetchJson<any>(url, { source: "FEMA NFHL" });
  const attr = data?.features?.[0]?.attributes;
  if (!attr || !attr.FLD_ZONE) return null;
  return {
    fldZone: String(attr.FLD_ZONE),
    zoneSubtype: attr.ZONE_SUBTY ? String(attr.ZONE_SUBTY) : null,
    sfha: String(attr.SFHA_TF).toUpperCase() === "T",
  };
}
