// End-to-end smoke test: spawns the built server over stdio via the MCP SDK
// client and calls every tool. Run: node test/smoke.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const transport = new StdioClientTransport({
  command: "node",
  args: [resolve(root, "dist/index.js")],
  cwd: root,
});
const client = new Client({ name: "smoke", version: "1.0.0" });

const text = (r) => r.content?.[0]?.text ?? JSON.stringify(r);

await client.connect(transport);

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "));
console.log("");

async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  console.log(`▶ ${name}(${JSON.stringify(args)})${r.isError ? " [isError]" : ""}`);
  console.log("  " + text(r));
  console.log("");
}

// 1. Geocode a known address
await call("geocode_address", { address: "1600 Pennsylvania Ave NW, Washington, DC 20500" });

// 2. Reverse: coordinate -> tract (New Orleans)
await call("lookup_census_tract", { latitude: 29.9511, longitude: -90.0715 });

// 3. Opportunity Zone — coords (New Orleans, expected OZ/LIC), direct tract, and a non-OZ
await call("check_opportunity_zone", { latitude: 29.9511, longitude: -90.0715 });
await call("check_opportunity_zone", { tract_geoid: "22071013400" }); // expected OZ
await call("check_opportunity_zone", { tract_geoid: "11001004600" }); // expected NOT OZ
await call("check_opportunity_zone", { address: "1600 Pennsylvania Ave NW, Washington, DC 20500" });

// 4. Demographics — no CENSUS_API_KEY set -> friendly error expected
await call("get_tract_demographics", { tract_geoid: "22071013400" });

// 5. Flood zone (New Orleans)
await call("check_flood_zone", { latitude: 29.9511, longitude: -90.0715 });

await client.close();
console.log("DONE");
