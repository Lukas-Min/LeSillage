"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PhLocationOption, PhProvinceOption } from "@/lib/ph-locations";

const selectClass = "h-8 w-full rounded-lg border bg-background px-2.5 text-sm";

export interface PhAddressValues {
  region: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
  street: string;
}

/**
 * Cascading Province -> City -> Barangay selects, backed by the live PSGC
 * API (src/lib/ph-locations.ts) via /api/ph-locations/*. Region isn't shown
 * as its own field — it's auto-derived from the chosen province and only
 * surfaces through `onChange`/the hidden `region` input, matching the
 * store's request to drop the redundant Region field from the UI while the
 * `addresses.region` column (and past orders' addressSnapshot) keeps
 * working unchanged.
 *
 * Uncontrolled from the parent's perspective — give it a `key` (e.g. the
 * selected saved-address id) to reset it to new defaults, the same pattern
 * used for "swap in a different record" elsewhere in this codebase. Emits
 * every change via `onChange` for parents that manage their own submit
 * payload (checkout-form.tsx); parents using a plain `<form
 * action={serverAction}>` instead pass `fieldNames` to also get hidden
 * inputs FormData can read.
 */
export function PhAddressFields({
  provinces,
  defaultProvinceName,
  defaultCityName,
  defaultBarangayName,
  defaultPostalCode = "",
  defaultStreet = "",
  onChange,
  fieldNames,
  idPrefix = "ph",
}: {
  provinces: PhProvinceOption[];
  defaultProvinceName?: string;
  defaultCityName?: string;
  defaultBarangayName?: string;
  defaultPostalCode?: string;
  defaultStreet?: string;
  onChange?: (values: PhAddressValues) => void;
  fieldNames?: {
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
    postalCode?: string;
    street?: string;
  };
  /** Prefixes every internal element id — set a unique value whenever more
   *  than one PhAddressFields renders on the same page (e.g. one per saved
   *  address's edit form) so ids/label associations don't collide. */
  idPrefix?: string;
}) {
  const initialProvince = useMemo(
    () => provinces.find((p) => p.name === defaultProvinceName) ?? null,
    [provinces, defaultProvinceName],
  );
  const [provinceCode, setProvinceCode] = useState(initialProvince?.code ?? "");
  const [cities, setCities] = useState<PhLocationOption[]>([]);
  const [cityCode, setCityCode] = useState("");
  const [barangays, setBarangays] = useState<PhLocationOption[]>([]);
  const [barangayCode, setBarangayCode] = useState("");
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [street, setStreet] = useState(defaultStreet);
  const [citiesLoading, setCitiesLoading] = useState(Boolean(initialProvince));
  const [barangaysLoading, setBarangaysLoading] = useState(false);

  // A saved address whose province/city/barangay text doesn't match any
  // current PSGC option (renamed, typo, or entered before this dropdown
  // existed) still needs to show as the current selection rather than
  // silently going blank — kept as one extra option each, not forced into
  // the real list.
  const selectedProvince = provinces.find((p) => p.code === provinceCode) ?? null;
  const provinceFallback =
    defaultProvinceName && !initialProvince && provinceCode === "" ? defaultProvinceName : null;
  const selectedCity = cities.find((c) => c.code === cityCode) ?? null;
  const cityFallback =
    defaultCityName && cityCode === "" && !citiesLoading && !cities.some((c) => c.name === defaultCityName)
      ? defaultCityName
      : null;
  const selectedBarangay = barangays.find((b) => b.code === barangayCode) ?? null;
  const barangayFallback =
    defaultBarangayName &&
    barangayCode === "" &&
    !barangaysLoading &&
    !barangays.some((b) => b.name === defaultBarangayName)
      ? defaultBarangayName
      : null;

  useEffect(() => {
    if (!provinceCode) {
      setCities([]);
      setCityCode("");
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    fetch(`/api/ph-locations/cities?province=${encodeURIComponent(provinceCode)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: PhLocationOption[]) => {
        if (cancelled) return;
        setCities(rows);
        const match = defaultCityName ? rows.find((c) => c.name === defaultCityName) : undefined;
        setCityCode(match?.code ?? "");
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Only re-fetch when the province actually changes — defaultCityName is
    // consumed once, for the initial match, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceCode]);

  useEffect(() => {
    if (!cityCode) {
      setBarangays([]);
      setBarangayCode("");
      return;
    }
    let cancelled = false;
    setBarangaysLoading(true);
    fetch(`/api/ph-locations/barangays?city=${encodeURIComponent(cityCode)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: PhLocationOption[]) => {
        if (cancelled) return;
        setBarangays(rows);
        const match = defaultBarangayName ? rows.find((b) => b.name === defaultBarangayName) : undefined;
        setBarangayCode(match?.code ?? "");
      })
      .catch(() => {
        if (!cancelled) setBarangays([]);
      })
      .finally(() => {
        if (!cancelled) setBarangaysLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityCode]);

  const values: PhAddressValues = {
    region: selectedProvince?.regionName ?? "",
    province: selectedProvince?.name ?? provinceFallback ?? "",
    city: selectedCity?.name ?? cityFallback ?? "",
    barangay: selectedBarangay?.name ?? barangayFallback ?? "",
    postalCode,
    street,
  };

  useEffect(() => {
    onChange?.(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.region, values.province, values.city, values.barangay, values.postalCode, values.street]);

  return (
    <>
      {fieldNames?.region ? <input type="hidden" name={fieldNames.region} value={values.region} /> : null}
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-province`}>Province</Label>
        <select
          id={`${idPrefix}-province`}
          className={selectClass}
          value={provinceCode}
          required
          onChange={(event) => {
            setProvinceCode(event.target.value);
            setCityCode("");
            setBarangayCode("");
          }}
        >
          <option value="">Select province</option>
          {provinceFallback ? (
            <option value="" disabled>
              {provinceFallback} (not found — pick again)
            </option>
          ) : null}
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        {fieldNames?.province ? <input type="hidden" name={fieldNames.province} value={values.province} /> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-city`}>City / Municipality</Label>
        <select
          id={`${idPrefix}-city`}
          className={selectClass}
          value={cityCode}
          disabled={!provinceCode || citiesLoading}
          required
          onChange={(event) => {
            setCityCode(event.target.value);
            setBarangayCode("");
          }}
        >
          <option value="">{citiesLoading ? "Loading…" : "Select city / municipality"}</option>
          {cityFallback ? (
            <option value="" disabled>
              {cityFallback} (not found — pick again)
            </option>
          ) : null}
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldNames?.city ? <input type="hidden" name={fieldNames.city} value={values.city} /> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-barangay`}>Barangay</Label>
        <select
          id={`${idPrefix}-barangay`}
          className={selectClass}
          value={barangayCode}
          disabled={!cityCode || barangaysLoading}
          required
          onChange={(event) => setBarangayCode(event.target.value)}
        >
          <option value="">{barangaysLoading ? "Loading…" : "Select barangay"}</option>
          {barangayFallback ? (
            <option value="" disabled>
              {barangayFallback} (not found — pick again)
            </option>
          ) : null}
          {barangays.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
        {fieldNames?.barangay ? <input type="hidden" name={fieldNames.barangay} value={values.barangay} /> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-postal-code`}>Postal code</Label>
        <Input
          id={`${idPrefix}-postal-code`}
          name={fieldNames?.postalCode}
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          minLength={4}
          required
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-street`}>Street address</Label>
        <Input
          id={`${idPrefix}-street`}
          name={fieldNames?.street}
          value={street}
          onChange={(event) => setStreet(event.target.value)}
          required
        />
      </div>
    </>
  );
}
