import { describe, expect, it } from "vitest";
import { formGender, notesText } from "../product-copy";

describe("formGender", () => {
  it("maps the form's own values and Fragrantica's wording", () => {
    expect(formGender("women")).toBe("women");
    expect(formGender("for women")).toBe("women");
    expect(formGender("Men")).toBe("men");
    expect(formGender("for women and men")).toBe("unisex");
    expect(formGender("Unisex")).toBe("unisex");
    expect(formGender(null)).toBe("");
    expect(formGender("something else")).toBe("");
  });
});

describe("notesText", () => {
  it("keeps the product's own notes, or builds them from the pyramid", () => {
    expect(notesText("Top: Kiwi", null)).toBe("Top: Kiwi");
    expect(notesText("", { top: ["Kiwi", "Orange"], middle: ["Rose"], base: [] })).toBe("Top: Kiwi, Orange | Middle: Rose");
    expect(notesText(null, null)).toBe("");
  });
});
