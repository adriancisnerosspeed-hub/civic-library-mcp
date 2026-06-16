import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAcs } from "../sources/census.js";
import { jsonResult, errorResult } from "../lib/format.js";

const ACS_YEAR = Number(process.env.CENSUS_ACS_YEAR ?? "2023");

// Friendly field name -> the ACS variable(s) it needs.
const SINGLE_VARS: Record<string, string> = {
  population: "B01003_001E",
  median_household_income: "B19013_001E",
  median_home_value: "B25077_001E",
  median_gross_rent: "B25064_001E",
  median_age: "B01002_001E",
  households: "B11001_001E",
};
// poverty_rate is derived: persons below poverty / poverty universe.
const POVERTY_BELOW = "B17001_002E";
const POVERTY_UNIVERSE = "B17001_001E";

const SUPPORTED = [...Object.keys(SINGLE_VARS), "poverty_rate"];
const DEFAULT_FIELDS = [
  "population",
  "median_household_income",
  "median_home_value",
  "poverty_rate",
];

/** Coerce an ACS string to a number, treating Census missing-data sentinels as null. */
function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  // ACS encodes "not available" as large negatives like -666666666.
  if (!Number.isFinite(n) || n <= -666666660) return null;
  return n;
}

export function registerDemographics(server: McpServer) {
  server.registerTool(
    "get_tract_demographics",
    {
      title: "Get census tract demographics (ACS 5-Year)",
      description:
        `Return demographic indicators for an 11-digit census tract GEOID from the American Community Survey 5-Year (${ACS_YEAR}). ` +
        `Requires a free Census API key in the CENSUS_API_KEY environment variable (get one instantly at https://api.census.gov/data/key_signup.html). ` +
        `Available fields: ${SUPPORTED.join(", ")}. Omit 'fields' to get a sensible default set.`,
      inputSchema: {
        tract_geoid: z
          .string()
          .regex(/^\d{11}$/)
          .describe("An 11-digit census tract GEOID (state[2] + county[3] + tract[6])"),
        fields: z
          .array(z.enum(SUPPORTED as [string, ...string[]]))
          .optional()
          .describe(`Which indicators to return. Defaults to: ${DEFAULT_FIELDS.join(", ")}`),
      },
    },
    async ({ tract_geoid, fields }) => {
      const key = process.env.CENSUS_API_KEY;
      if (!key) {
        return errorResult(
          "get_tract_demographics requires a free Census API key. Get one instantly at https://api.census.gov/data/key_signup.html, then set CENSUS_API_KEY in this MCP server's environment.",
        );
      }

      const requested = fields && fields.length ? fields : DEFAULT_FIELDS;

      // Collect the ACS variables we actually need.
      const needVars = new Set<string>();
      for (const f of requested) {
        if (f === "poverty_rate") {
          needVars.add(POVERTY_BELOW);
          needVars.add(POVERTY_UNIVERSE);
        } else {
          needVars.add(SINGLE_VARS[f]);
        }
      }

      try {
        const acs = await getAcs(tract_geoid, [...needVars], key, ACS_YEAR);

        const out: Record<string, unknown> = {
          tract_geoid,
          tract_name: acs.NAME ?? null,
          acs_dataset: `ACS 5-Year ${ACS_YEAR}`,
          source: "U.S. Census Bureau, American Community Survey",
        };

        for (const f of requested) {
          if (f === "poverty_rate") {
            const below = num(acs[POVERTY_BELOW]);
            const universe = num(acs[POVERTY_UNIVERSE]);
            out[f] = below != null && universe ? Math.round((below / universe) * 10000) / 10000 : null;
          } else {
            out[f] = num(acs[SINGLE_VARS[f]]);
          }
        }

        return jsonResult(out);
      } catch (e) {
        return errorResult((e as Error).message);
      }
    },
  );
}
