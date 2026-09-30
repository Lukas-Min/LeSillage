import { describe, expect, it } from "vitest";
import { isArchivedProduct } from "../product-archive";

describe("isArchivedProduct", () => {
  it("is archived when hidden with every size switched off", () => {
    expect(isArchivedProduct({ isActive: false }, [{ isActive: false }, { isActive: false }])).toBe(true);
  });

  it("is only hidden when a size is still on (a fresh import) or it has no sizes yet (a draft)", () => {
    expect(isArchivedProduct({ isActive: false }, [{ isActive: true }, { isActive: false }])).toBe(false);
    expect(isArchivedProduct({ isActive: false }, [])).toBe(false);
  });

  it("is never archived while visible", () => {
    expect(isArchivedProduct({ isActive: true }, [{ isActive: false }])).toBe(false);
  });
});
