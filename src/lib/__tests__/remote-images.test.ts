import { describe, expect, it } from "vitest";
import { canOptimizeImage } from "../remote-images";

describe("canOptimizeImage", () => {
  it("optimizes Fragrantica and Vercel Blob photos", () => {
    expect(canOptimizeImage("https://fimgs.net/mdimg/perfume-thumbs/375x500.65988.jpg")).toBe(true);
    expect(canOptimizeImage("https://abc123.public.blob.vercel-storage.com/products/x.webp")).toBe(true);
  });

  it("serves our own compressed photos as-is", () => {
    expect(canOptimizeImage("https://abc123.public.blob.vercel-storage.com/public/product-photos/p1/1-a.webp")).toBe(false);
  });

  it("shows any other host, plain http, or a malformed URL as-is", () => {
    expect(canOptimizeImage("https://example.com/photo.jpg")).toBe(false);
    expect(canOptimizeImage("https://fimgs.net.evil.com/photo.jpg")).toBe(false);
    expect(canOptimizeImage("http://fimgs.net/photo.jpg")).toBe(false);
    expect(canOptimizeImage("not a url")).toBe(false);
  });
});
