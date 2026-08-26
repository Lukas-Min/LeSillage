import { describe, expect, it } from "vitest";
import {
  PHONE_PLACEHOLDER,
  isValidPhilippineMobile,
  normalizePhoneInput,
  phMobileRequiredSchema,
  phMobileSchema,
} from "../phone";

describe("PH phone", () => {
  it("accepts exactly 10 digits starting with 9", () => {
    expect(isValidPhilippineMobile("9171234567")).toBe(true);
    expect(isValidPhilippineMobile("991-234-5678")).toBe(true);
    expect(normalizePhoneInput("+63 917 123 4567")).toBe("639171234567");
    expect(isValidPhilippineMobile(normalizePhoneInput("+639171234567").slice(2))).toBe(true);
  });

  it("rejects a leading 0", () => {
    expect(isValidPhilippineMobile("09171234567")).toBe(false);
  });

  it("rejects 11 digits", () => {
    expect(isValidPhilippineMobile("991712345678")).toBe(false);
  });

  it("rejects an invalid first digit", () => {
    expect(isValidPhilippineMobile("8000000000")).toBe(false);
  });

  it("schema", () => {
    expect(phMobileSchema.parse("9171234567")).toBe("9171234567");
    expect(phMobileSchema.parse("+63 917 123 4567")).toBe("639171234567");
    expect(() => phMobileSchema.parse("0917")).toThrow();
  });

  it("required schema rejects empty", () => {
    expect(() => phMobileRequiredSchema.parse("")).toThrow();
    expect(phMobileRequiredSchema.parse("9171234567")).toBe("9171234567");
  });

  it("placeholder matches the example", () => {
    expect(PHONE_PLACEHOLDER).toBe("9171234567");
  });
});
