import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { geocodeCoordinates } from "../sources/census.js";
import { jsonResult, errorResult } from "../lib/format.js";
import { stateName } from "../lib/geo.js";

export function registerCensusTract(server: McpServer) {
  server.registerTool(
    "lookup_census_tract",
    {
      title: "Look up the census tract for a coordinate",
      description:
        "Return the 2020 census tract (with county and state) that contains a latitude/longitude point. Free, no API key. Source: U.S. Census Bureau Geocoder.",
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
        const loc = await geocodeCoordinates(longitude, latitude);
        if (!loc || !loc.tractGeoid) {
          return jsonResult({
            matched: false,
            message: "No census tract found for that coordinate (point may be outside the US).",
          });
        }
        return jsonResult({
          matched: true,
          tract_geoid: loc.tractGeoid,
          tract_name: loc.tractName,
          county_name: loc.countyName,
          county_fips: loc.countyFips,
          state: loc.stateAbbr,
          state_fips: loc.stateFips,
          state_name: stateName(loc.stateFips),
          tract_vintage: "2020",
          source: "U.S. Census Bureau Geocoder",
        });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );
}
