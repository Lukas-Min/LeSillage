import { z } from "zod";

const DIGITS_ONLY = /^9\d{9}$/;

export function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidPhilippineMobile(value: string): boolean {
  return DIGITS_ONLY.test(normalizePhoneInput(value));
}

export const phMobileSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 0 || value.length === 10, {
    message: "Mobile must be 10 digits after the country code",
  })
  .refine((value) => value.length === 0 || value.startsWith("9"), {
    message: "Mobile must start with 9",
  })
  .refine((value) => value.length === 0 || DIGITS_ONLY.test(value), {
    message: "Mobile must be 10 digits starting with 9 (do not include +63 or 0)",
  });

export const phMobileRequiredSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => DIGITS_ONLY.test(value), {
    message: "Mobile must be 10 digits starting with 9 (do not include +63 or 0)",
  });

export const PHONE_PLACEHOLDER = "9171234567";
export const PHONE_COUNTRY = "+63";
