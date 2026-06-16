#!/usr/bin/env node
/**
 * civic-library-mcp — MCP server for US civic & property data.
 *
 * Tools: geocode_address, lookup_census_tract, check_opportunity_zone,
 * get_tract_demographics, check_flood_zone. All data comes from free federal
 * open-data sources (U.S. Census Bureau, U.S. Treasury CDFI Fund, FEMA).
 *
 * stdio transport: stdout is the JSON-RPC channel — never write to it. Any
 * diagnostics must go to stderr (console.error).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerGeocode } from "./tools/geocode.js";
import { registerCensusTract } from "./tools/censusTract.js";
import { registerOpportunityZone } from "./tools/opportunityZone.js";
import { registerDemographics } from "./tools/demographics.js";
import { registerFloodZone } from "./tools/floodZone.js";

async function main() {
  const server = new McpServer({
    name: "civic-library-mcp",
    version: "0.1.0",
  });

  registerGeocode(server);
  registerCensusTract(server);
  registerOpportunityZone(server);
  registerDemographics(server);
  registerFloodZone(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("civic-library-mcp running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting civic-library-mcp:", err);
  process.exit(1);
});
