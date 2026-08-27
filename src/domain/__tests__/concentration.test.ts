import { describe, expect, it } from "vitest";
import { CONCENTRATION_LABELS, concentrationLabel, guessConcentration, sizeOnlyLabel } from "../concentration";

describe("concentrationLabel", () => {
  it("maps every concentration to its full display name", () => {
    expect(concentrationLabel("EAU_DE_COLOGNE")).toBe("Eau de Cologne");
    expect(concentrationLabel("EAU_DE_TOILETTE")).toBe("Eau de Toilette");
    expect(concentrationLabel("EAU_DE_PARFUM")).toBe("Eau de Parfum");
    expect(concentrationLabel("PARFUM")).toBe("Parfum");
    expect(concentrationLabel("EXTRAIT_DE_PARFUM")).toBe("Extrait de Parfum");
  });

  it("returns null for null or undefined", () => {
    expect(concentrationLabel(null)).toBeNull();
    expect(concentrationLabel(undefined)).toBeNull();
  });

  it("covers every key in CONCENTRATION_LABELS", () => {
    for (const key of Object.keys(CONCENTRATION_LABELS)) {
      expect(concentrationLabel(key as keyof typeof CONCENTRATION_LABELS)).toBe(
        CONCENTRATION_LABELS[key as keyof typeof CONCENTRATION_LABELS],
      );
    }
  });
});

describe("guessConcentration", () => {
  it("recognises full phrases regardless of case", () => {
    expect(guessConcentration("100ml Eau de Parfum")).toBe("EAU_DE_PARFUM");
    expect(guessConcentration("100ML EAU DE TOILETTE")).toBe("EAU_DE_TOILETTE");
    expect(guessConcentration("Eau de Cologne")).toBe("EAU_DE_COLOGNE");
    expect(guessConcentration("Extrait de Parfum")).toBe("EXTRAIT_DE_PARFUM");
  });

  it("recognises abbreviations", () => {
    expect(guessConcentration("100ml EDP")).toBe("EAU_DE_PARFUM");
    expect(guessConcentration("100ml EDT")).toBe("EAU_DE_TOILETTE");
    expect(guessConcentration("100ml EDC")).toBe("EAU_DE_COLOGNE");
  });

  it("prefers extrait over a bare 'parfum' match", () => {
    expect(guessConcentration("Extrait de Parfum, 50ml")).toBe("EXTRAIT_DE_PARFUM");
  });

  it("falls back to PARFUM when only the bare word appears", () => {
    expect(guessConcentration("50ml Parfum")).toBe("PARFUM");
  });

  it("returns null when nothing matches, or for empty/null/undefined input", () => {
    expect(guessConcentration("3ml Decant")).toBeNull();
    expect(guessConcentration("")).toBeNull();
    expect(guessConcentration(null)).toBeNull();
    expect(guessConcentration(undefined)).toBeNull();
  });
});

describe("sizeOnlyLabel", () => {
  it("strips the concentration phrase, leaving just the size", () => {
    expect(sizeOnlyLabel("100ml Eau de Parfum")).toBe("100ml");
    expect(sizeOnlyLabel("100ml Eau de Toilette")).toBe("100ml");
    expect(sizeOnlyLabel("50ml Extrait de Parfum")).toBe("50ml");
  });

  it("strips abbreviations too", () => {
    expect(sizeOnlyLabel("100ml EDP")).toBe("100ml");
  });

  it("is case-insensitive", () => {
    expect(sizeOnlyLabel("100ML EAU DE PARFUM")).toBe("100ML");
  });

  it("leaves labels with no concentration phrase untouched apart from trimming", () => {
    expect(sizeOnlyLabel("3ml Decant")).toBe("3ml Decant");
    expect(sizeOnlyLabel("  30ml Partial Bottle  ")).toBe("30ml Partial Bottle");
  });
});
