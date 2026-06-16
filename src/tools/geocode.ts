import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { geocodeAddress } from "../sources/census.js";
import { jsonResult, errorResult } from "../lib/format.js";
import { stateName } from "../lib/geo.js";

export function registerGeocode(server: McpServer) {
  server.registerTool(
    "geocode_address",
    {
      title: "Geocode a US address",
      description:
        "Convert a US street address into latitude/longitude plus its Census geographies (state, county, 2020 census tract GEOID). Free, no API key. Source: U.S. Census Bureau Geocoder.",
      inputSchema: {
        address: z
          .string()
          .min(3)
          .describe(
            "A US street address, e.g. '1600 Pennsylvania Ave NW, Washington, DC 20500'",
          ),
      },
    },
    async ({ address }) => {
      try {
        const loc = await geocodeAddress(address);
        if (!loc) {
          return jsonResult({ matched: false, message: "No match found for that address." });
        }
        return jsonResult({
          matched: true,
          matched_address: loc.matchedAddress,
          latitude: loc.latitude,
          longitude: loc.longitude,
          state: loc.stateAbbr,
          state_fips: loc.stateFips,
          state_name: stateName(loc.stateFips),
          county_name: loc.countyName,
          county_fips: loc.countyFips,
          tract_geoid: loc.tractGeoid,
          tract_name: loc.tractName,
          tract_vintage: "2020",
          source: "U.S. Census Bureau Geocoder",
        });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );
}
