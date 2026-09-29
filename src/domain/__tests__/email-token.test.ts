import { describe, expect, it } from "vitest";
import { signEmailToken, verifyEmailToken } from "../email-token";

const secret = "test-secret-at-least-thirty-two-characters";

describe("email link tokens", () => {
  it("verifies a token for the same purpose and address, whatever the case", () => {
    const token = signEmailToken(secret, "unsubscribe", "Ana@Example.com");
    expect(verifyEmailToken(secret, "unsubscribe", "ana@example.com", token)).toBe(true);
  });

  it("rejects a token for another address, another purpose, or another secret", () => {
    const token = signEmailToken(secret, "unsubscribe", "ana@example.com");
    expect(verifyEmailToken(secret, "unsubscribe", "ben@example.com", token)).toBe(false);
    expect(verifyEmailToken(secret, "newsletter-confirm", "ana@example.com", token)).toBe(false);
    expect(verifyEmailToken("a-different-secret-of-enough-length!!", "unsubscribe", "ana@example.com", token)).toBe(false);
  });

  it("rejects a tampered or empty token", () => {
    const token = signEmailToken(secret, "newsletter-confirm", "ana@example.com");
    expect(verifyEmailToken(secret, "newsletter-confirm", "ana@example.com", `${token}x`)).toBe(false);
    expect(verifyEmailToken(secret, "newsletter-confirm", "ana@example.com", "")).toBe(false);
  });
});
