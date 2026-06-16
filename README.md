# civic-library-mcp

**An MCP server that gives AI agents clean, token-efficient access to US civic & property data — geocoding, census tracts, Opportunity Zones, ACS demographics, and FEMA flood zones — sourced entirely from free federal open data.**

No scraping, no paid keys for the core tools, no proprietary databases. Just the official sources (U.S. Census Bureau, U.S. Treasury CDFI Fund, FEMA), wrapped in a small set of well-described tools that return compact JSON instead of the bloated payloads most data MCPs dump into your context window.

Built for developers working on **proptech, real-estate, fintech, civic tech, GIS, and housing research** with AI agents.

---

## Tools

| Tool | What it does | API key? |
|---|---|---|
| `geocode_address` | US street address → lat/lng + state, county, and 2020 census tract GEOID | None |
| `lookup_census_tract` | lat/lng → the 2020 census tract (with county/state) containing that point | None |
| `check_opportunity_zone` | Is this address / point / tract in a designated Qualified Opportunity Zone? | None |
| `get_tract_demographics` | ACS 5-Year indicators (income, population, home value, poverty rate, …) for a tract | Free Census key |
| `check_flood_zone` | lat/lng → FEMA flood-hazard zone + whether it's a Special Flood Hazard Area | None |

Four of the five tools work with **zero configuration**. Only `get_tract_demographics` needs a free Census API key (see below).

---

## Install

### Claude Desktop / Cursor / any MCP client

Add to your MCP config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "civic-library": {
      "command": "npx",
      "args": ["-y", "civic-library-mcp"],
      "env": {
        "CENSUS_API_KEY": "your-free-census-key-optional"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add civic-library -- npx -y civic-library-mcp
```

The `CENSUS_API_KEY` line is optional — leave it out and four of the five tools still work.

### Census API key (only for demographics)

`get_tract_demographics` calls the U.S. Census ACS Data API, which requires a free key. Get one in ~30 seconds at **<https://api.census.gov/data/key_signup.html>** and set it as `CENSUS_API_KEY` in the server's environment.

---

## Examples

**Check whether a property is in an Opportunity Zone:**

```jsonc
// check_opportunity_zone({ "address": "900 Camp St, New Orleans, LA 70130" })
{
  "is_opportunity_zone": true,
  "tract_geoid_2010": "22071013400",
  "designation_type": "Low-Income Community",
  "round": "1.0",
  "authority": "Tax Cuts and Jobs Act of 2017 (26 U.S.C. § 1400Z-1)",
  "resolved_from": "address",
  "source": "U.S. Treasury CDFI Fund (designated 2018-12-14)"
}
```

**Flood risk for a coordinate:**

```jsonc
// check_flood_zone({ "latitude": 29.9511, "longitude": -90.0715 })
{
  "flood_zone": "X",
  "zone_subtype": "0.2 PCT ANNUAL CHANCE FLOOD HAZARD",
  "in_special_flood_hazard_area": false,
  "zone_description": "Moderate-to-minimal risk (outside the 1% annual-chance floodplain).",
  "source": "FEMA National Flood Hazard Layer"
}
```

**Tract demographics (needs a key):**

```jsonc
// get_tract_demographics({ "tract_geoid": "22071013400",
//   "fields": ["population", "median_household_income", "poverty_rate"] })
{
  "tract_geoid": "22071013400",
  "tract_name": "Census Tract 134, Orleans Parish, Louisiana",
  "acs_dataset": "ACS 5-Year 2023",
  "population": 2276,
  "median_household_income": 41250,
  "poverty_rate": 0.231
}
```

---

## A note on correctness: Opportunity Zones use 2010 census tracts

Opportunity Zone designations are keyed to **2010** census tract boundaries, but the default Census geocoder returns **2020** tracts — and tract GEOIDs changed between the two vintages. A naive lookup that matches a 2020 GEOID against the OZ list will silently return wrong answers near any boundary that moved.

`check_opportunity_zone` handles this correctly: it re-resolves the address/coordinate to its **2010** tract before matching. (You can see the difference — the same address can yield GEOID `…980000` from `geocode_address` and `…006202` from `check_opportunity_zone`.) If you pass `tract_geoid` directly, it's treated as a 2010 GEOID.

---

## Data sources & licensing

| Data | Source | Notes |
|---|---|---|
| Geocoding & census tracts | [U.S. Census Bureau Geocoder](https://geocoding.geo.census.gov/) | Public domain |
| Opportunity Zones | [U.S. Treasury CDFI Fund](https://www.cdfifund.gov/opportunity-zones) | Round 1 (2018) designations, 8,764 tracts, bundled |
| Demographics | [U.S. Census ACS 5-Year](https://www.census.gov/data/developers/data-sets/acs-5year.html) | Public domain; free key required |
| Flood zones | [FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer) | Public domain |

All underlying data is U.S. federal open data (public domain). This software is MIT-licensed.

The bundled Opportunity Zone list is regenerated with `npm run build:oz`.

---

## Roadmap

- **OZ 2.0** — designations under the One Big Beautiful Bill Act (2025) once finalized/published.
- **More ACS fields** — educational attainment, race/ethnicity, housing tenure, commute.
- **County parcel / CAD lookups** — added per-county only where the source's terms of use permit automated access.
- **Census place & ZIP geographies**, FEMA base flood elevations.

---

## Disclaimer

This tool surfaces public government data for informational purposes. It is **not** legal, financial, tax, insurance, or investment advice. Opportunity Zone, flood-zone, and demographic determinations should be confirmed against the official source of record before relying on them for any transaction. Data is provided "as is" with no warranty.

## Contributing

Issues and PRs welcome — especially additional federal open-data sources and ACS fields. Keep responses compact (token cost is a feature) and every data point attributed to its source.

## License

MIT © 2026 Adrian Cisneros
