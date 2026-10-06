import { describe, expect, it } from "vitest";
import { poolConfigFromUrl } from "../client";

// pg reads sslmode=require as "verify the certificate", which Supabase's own
// certificate authority fails; these pin the old driver's behaviour instead.
describe("poolConfigFromUrl", () => {
  const base = "postgres://user:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

  it("encrypts without checking the certificate for sslmode=require, and drops sslmode from the URL", () => {
    const config = poolConfigFromUrl(`${base}?sslmode=require`);
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.connectionString).toBe(base);
  });

  it("keeps the other URL parameters", () => {
    const config = poolConfigFromUrl(`${base}?sslmode=prefer&application_name=store`);
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.connectionString).toBe(`${base}?application_name=store`);
  });

  it("connects in plain text when there is no sslmode or it is disable", () => {
    expect(poolConfigFromUrl(base).ssl).toBe(false);
    expect(poolConfigFromUrl(`${base}?sslmode=disable`).ssl).toBe(false);
  });

  it("checks the certificate for verify-full", () => {
    expect(poolConfigFromUrl(`${base}?sslmode=verify-full`).ssl).toBe(true);
  });
});
