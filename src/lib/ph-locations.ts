/**
 * Philippine Standard Geographic Code (PSGC) lookups, backed by the public
 * PSGC API (psgc.gitlab.io) rather than a bundled dataset — full barangay
 * data alone is ~42,000 rows, too large to ship to the client or maintain
 * by hand, and this data changes essentially never so an aggressive cache
 * (30 days) keeps the external dependency off the checkout critical path
 * for all but the first request per province/city after a cache miss.
 * Every fetch is wrapped so a transient API outage degrades to an empty
 * list (the UI falls back to keeping whatever was already selected)
 * instead of blocking address entry entirely.
 */
const PSGC_BASE = "https://psgc.gitlab.io/api";
const CACHE = { next: { revalidate: 60 * 60 * 24 * 30 } };

// NCR has no province level — its cities/municipalities sit directly under
// the region. Modeled as one synthetic "province" entry in the dropdown so
// the rest of the UI doesn't need a special case; its code is prefixed so
// fetchCityOptions knows to hit the regions endpoint instead of provinces.
const NCR_REGION_CODE = "130000000";
export const NCR_PROVINCE_CODE = `region:${NCR_REGION_CODE}`;

export interface PhProvinceOption {
  code: string;
  name: string;
  /** Short region name (e.g. "NCR", "Ilocos Region") — stored as the
   *  address's `region` field, auto-derived from the chosen province. */
  regionName: string;
}

export interface PhLocationOption {
  code: string;
  name: string;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${PSGC_BASE}${path}`, CACHE);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchProvinceOptions(): Promise<PhProvinceOption[]> {
  const [regions, provinces] = await Promise.all([
    fetchJson<Array<{ code: string; name: string }>>("/regions/"),
    fetchJson<Array<{ code: string; name: string; regionCode: string }>>("/provinces/"),
  ]);
  if (!regions || !provinces) return [];
  const regionNameByCode = new Map(regions.map((r) => [r.code, r.name]));
  const options: PhProvinceOption[] = provinces.map((p) => ({
    code: p.code,
    name: p.name,
    regionName: regionNameByCode.get(p.regionCode) ?? "",
  }));
  const ncr = regions.find((r) => r.code === NCR_REGION_CODE);
  if (ncr) options.push({ code: NCR_PROVINCE_CODE, name: "Metro Manila", regionName: ncr.name });
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCityOptions(provinceCode: string): Promise<PhLocationOption[]> {
  const isRegionLevel = provinceCode.startsWith("region:");
  const path = isRegionLevel
    ? `/regions/${provinceCode.slice("region:".length)}/cities-municipalities/`
    : `/provinces/${provinceCode}/cities-municipalities/`;
  const rows = await fetchJson<Array<{ code: string; name: string }>>(path);
  if (!rows) return [];
  return rows.map((r) => ({ code: r.code, name: r.name })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchBarangayOptions(cityCode: string): Promise<PhLocationOption[]> {
  const rows = await fetchJson<Array<{ code: string; name: string }>>(
    `/cities-municipalities/${cityCode}/barangays/`,
  );
  if (!rows) return [];
  return rows.map((r) => ({ code: r.code, name: r.name })).sort((a, b) => a.name.localeCompare(b.name));
}
