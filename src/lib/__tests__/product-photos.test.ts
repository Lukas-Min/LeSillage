import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { compressProductPhoto } from "../product-photos";

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 150, b: 120 } } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("compressProductPhoto", () => {
  it("stores a large upload as WebP no wider than 750px, keeping its shape", async () => {
    const meta = await sharp(await compressProductPhoto(await jpeg(3000, 4000))).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(750);
    expect(meta.height).toBe(1000);
  });

  it("never enlarges a small photo such as Fragrantica's 375×500", async () => {
    const meta = await sharp(await compressProductPhoto(await jpeg(375, 500))).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(375);
    expect(meta.height).toBe(500);
  });
});
