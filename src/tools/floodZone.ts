import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { floodAtPoint } from "../sources/fema.js";
import { jsonResult, errorResult } from "../lib/format.js";

// Plain-language descriptions for the common FEMA flood-zone codes.
const ZONE_DESCRIPTIONS: Record<string, string> = {
  A: "High-risk area (1% annual-chance flood); no base flood elevation determined.",
  AE: "High-risk area (1% annual-chance flood) with base flood elevations determined.",
  AH: "High-risk area of shallow flooding (1–3 ft ponding), 1% annual chance.",
  AO: "High-risk area of shallow sheet-flow flooding (1–3 ft), 1% annual chance.",
  AR: "Temporarily high-risk area due to a flood-control system being restored.",
  A99: "High-risk area to be protected by a flood-control system under construction.",
  V: "High-risk coastal area with wave action; no base flood elevation determined.",
  VE: "High-risk coastal area with wave action and base flood elevations determined.",
  X: "Moderate-to-minimal risk (outside the 1% annual-chance floodplain).",
  D: "Possible but undetermined flood hazard; no analysis conducted.",
};

export function registerFloodZone(server: McpServer) {
  server.registerTool(
    "check_flood_zone",
    {
      title: "Check FEMA flood zone",
      description:
        "Return the FEMA flood-hazard zone for a latitude/longitude point, including whether it falls in a Special Flood Hazard Area (SFHA, where flood insurance is typically required). Free, no API key. Source: FEMA National Flood Hazard Layer.",
      inputSchema: {
        latitude: z.number().min(-90).max(90).describe("Latitude in decimal degrees (WGS84)"),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .describe("Longitude in decimal degrees (WGS84)"),
      },
    },
    async ({ latitude, longitude }) => {
      try {
        const r = await floodAtPoint(longitude, latitude);
        if (!r) {
          return jsonResult({
            flood_zone: null,
            message:
              "No FEMA NFHL data at this point (location may be outside mapped flood-hazard areas).",
            source: "FEMA National Flood Hazard Layer",
          });
        }
        return jsonResult({
          flood_zone: r.fldZone,
          zone_subtype: r.zoneSubtype,
          in_special_flood_hazard_area: r.sfha,
          zone_description: ZONE_DESCRIPTIONS[r.fldZone] ?? null,
          source: "FEMA National Flood Hazard Layer",
        });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );
}
