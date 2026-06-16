import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { geocodeAddress, geocodeCoordinates } from "../sources/census.js";
import { lookupOz } from "../sources/oz.js";
import { jsonResult, errorResult } from "../lib/format.js";

const OZ_2_0_NOTE =
  "Reflects Round 1 designations only. OZ 2.0 (One Big Beautiful Bill Act, 2025) designations are not yet finalized/published and are not included.";

export function registerOpportunityZone(server: McpServer) {
  server.registerTool(
    "check_opportunity_zone",
    {
      title: "Check Opportunity Zone status",
      description:
        "Determine whether a location is in a designated Qualified Opportunity Zone (Round 1, Tax Cuts and Jobs Act of 2017). Accepts an address, a lat/lng, or an 11-digit 2010 census tract GEOID. OZ designations are keyed to 2010 tracts, so address/coordinate inputs are resolved to their 2010 tract automatically. Free, no API key.",
      inputSchema: {
        address: z
          .string()
          .optional()
          .describe("US street address (resolved to its 2010 census tract)"),
        latitude: z.number().min(-90).max(90).optional().describe("Latitude (use with longitude)"),
        longitude: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe("Longitude (use with latitude)"),
        tract_geoid: z
          .string()
          .regex(/^\d{11}$/)
          .optional()
          .describe("An 11-digit 2010 census tract GEOID"),
      },
    },
    async ({ address, latitude, longitude, tract_geoid }) => {
      try {
        let geoid: string | undefined;
        let resolvedFrom: string;

        if (tract_geoid) {
          geoid = tract_geoid;
          resolvedFrom = "tract_geoid";
        } else if (address) {
          const loc = await geocodeAddress(address, "Census2010_Current");
          if (!loc) {
            return jsonResult({ matched: false, message: "No match found for that address." });
          }
          geoid = loc.tractGeoid;
          resolvedFrom = "address";
        } else if (latitude !== undefined && longitude !== undefined) {
          const loc = await geocodeCoordinates(longitude, latitude, "Census2010_Current");
          geoid = loc?.tractGeoid;
          resolvedFrom = "coordinates";
        } else {
          return errorResult(
            "Provide exactly one locator: 'address', both 'latitude' and 'longitude', or 'tract_geoid'.",
          );
        }

        if (!geoid) {
          return jsonResult({
            matched: false,
            message: "Could not resolve a 2010 census tract for that location.",
          });
        }

        const oz = lookupOz(geoid);
        return jsonResult({
          is_opportunity_zone: oz.isOz,
          tract_geoid_2010: geoid,
          designation_type: oz.designationType,
          round: oz.round,
          authority: oz.authority,
          resolved_from: resolvedFrom,
          source: "U.S. Treasury CDFI Fund (designated 2018-12-14)",
          note: OZ_2_0_NOTE,
        });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );
}
