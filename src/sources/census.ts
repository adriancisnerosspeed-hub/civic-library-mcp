/** U.S. Census Bureau clients: the public Geocoder (no key) and the ACS Data API (free key). */
import { fetchJson } from "../lib/http.js";
import { stateAbbr } from "../lib/geo.js";

const GEOCODER = "https://geocoding.geo.census.gov/geocoder";

/** Geocoder vintage. OZ designations use 2010 tracts; everything else uses 2020. */
export type Vintage = "Census2020_Current" | "Census2010_Current";

export interface ResolvedLocation {
  matchedAddress?: string;
  longitude: number;
  latitude: number;
  stateFips?: string;
  stateAbbr?: string;
  countyFips?: string;
  countyName?: string;
  tractGeoid?: string;
  tractName?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractGeo(
  geographies: any,
  coords: { x: number; y: number },
  matchedAddress?: string,
): ResolvedLocation {
  const tract = geographies?.["Census Tracts"]?.[0];
  const county = geographies?.["Counties"]?.[0];
  const state = geographies?.["States"]?.[0];
  const geoid: string | undefined = tract?.GEOID;
  const stateFips: string | undefined = state?.STATE ?? geoid?.slice(0, 2);
  const countyFips: string | undefined = county?.COUNTY ?? geoid?.slice(2, 5);
  return {
    matchedAddress,
    longitude: coords.x,
    latitude: coords.y,
    stateFips,
    stateAbbr: state?.STUSAB ?? stateAbbr(stateFips),
    countyFips,
    countyName: county?.BASENAME ?? county?.NAME,
    tractGeoid: geoid,
    tractName: tract?.NAME,
  };
}

export async function geocodeAddress(
  address: string,
  vintage: Vintage = "Census2020_Current",
): Promise<ResolvedLocation | null> {
  const url =
    `${GEOCODER}/geographies/onelineaddress?address=${encodeURIComponent(address)}` +
    `&benchmark=Public_AR_Current&vintage=${vintage}&format=json`;
  const data = await fetchJson<any>(url, { source: "Census Geocoder" });
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return extractGeo(match.geographies, match.coordinates, match.matchedAddress);
}

export async function geocodeCoordinates(
  longitude: number,
  latitude: number,
  vintage: Vintage = "Census2020_Current",
): Promise<ResolvedLocation | null> {
  const url =
    `${GEOCODER}/geographies/coordinates?x=${longitude}&y=${latitude}` +
    `&benchmark=Public_AR_Current&vintage=${vintage}&format=json`;
  const data = await fetchJson<any>(url, { source: "Census Geocoder" });
  const geographies = data?.result?.geographies;
  const tract = geographies?.["Census Tracts"]?.[0];
  if (!tract) return null;
  return extractGeo(geographies, { x: longitude, y: latitude });
}

/** Query the ACS 5-Year Data API for one tract. Returns a header->value record. */
export async function getAcs(
  tractGeoid: string,
  variableCodes: string[],
  key: string,
  year: number,
): Promise<Record<string, string>> {
  const state = tractGeoid.slice(0, 2);
  const county = tractGeoid.slice(2, 5);
  const tract = tractGeoid.slice(5, 11);
  const get = ["NAME", ...variableCodes].join(",");
  const url =
    `https://api.census.gov/data/${year}/acs/acs5?get=${get}` +
    `&for=tract:${tract}&in=state:${state}&in=county:${county}&key=${encodeURIComponent(key)}`;
  const rows = await fetchJson<string[][]>(url, { source: "Census ACS API" });
  const headers = rows?.[0];
  const values = rows?.[1];
  if (!headers || !values) return {};
  const out: Record<string, string> = {};
  headers.forEach((h, i) => (out[h] = values[i]));
  return out;
}
