import { describe, expect, it } from "vitest";
import {
  adminProductHref,
  adminProductsListHref,
  buildAdminProductList,
  parseProductListTab,
} from "../admin-product-list";

const product = (id: string, brand: string, name: string, type: "DECANT" | "FULL_BOTTLE" | "PARTIAL", isActive = true) => ({
  id,
  brand,
  name,
  type,
  isActive,
});
const sku = (productId: string, isActive = true, stock = 1) => ({
  productId,
  isActive,
  fulfillment: "ON_HAND" as const,
  stock,
});

const productRows = [
  product("u", "Velixir", "Uranus", "FULL_BOTTLE"),
  product("e", "Lanvin", "Eclat d'Arpège", "FULL_BOTTLE"),
  product("p", "Velixir", "Paladin", "DECANT"),
  product("x", "Armaf", "Club de Nuit", "FULL_BOTTLE", false), // archived: hidden, every size off
  product("s", "Valentino", "Coral Fantasy", "PARTIAL"), // sold-out partial: archived
];
const skuRows = [sku("u"), sku("e"), sku("p"), sku("x", false), sku("s", true, 0)];

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe("buildAdminProductList", () => {
  it("lists the live catalog alphabetically by brand, then name, under All", () => {
    expect(ids(buildAdminProductList(productRows, skuRows, "ALL", "").filtered)).toEqual(["e", "p", "u"]);
  });

  it("keeps only the tab's type", () => {
    expect(ids(buildAdminProductList(productRows, skuRows, "FULL_BOTTLE", "").filtered)).toEqual(["e", "u"]);
  });

  it("applies the shop's search on top of the tab", () => {
    expect(ids(buildAdminProductList(productRows, skuRows, "ALL", "velixir").filtered)).toEqual(["p", "u"]);
    expect(ids(buildAdminProductList(productRows, skuRows, "FULL_BOTTLE", "arpege").filtered)).toEqual(["e"]);
  });

  it("puts archived products, sold-out partials included, only under Archived", () => {
    expect(ids(buildAdminProductList(productRows, skuRows, "ARCHIVED", "").filtered)).toEqual(["x", "s"]);
  });
});

describe("links", () => {
  it("carry the tab and search, and leave out the defaults", () => {
    expect(adminProductHref("e", "ALL", "")).toBe("/admin/products/e");
    expect(adminProductHref("e", "FULL_BOTTLE", "eclat arpege")).toBe("/admin/products/e?type=FULL_BOTTLE&q=eclat+arpege");
    expect(adminProductsListHref("DECANT", "", 2)).toBe("/admin/products?type=DECANT&page=2");
    expect(parseProductListTab("nonsense")).toBe("ALL");
  });
});
