import sharp from "sharp";
import { uploadPublicImage } from "./blob";
import { PRODUCT_PHOTO_FOLDER } from "./remote-images";

/** Widest a stored photo gets: the product page draws it at most ~600px. */
export const PRODUCT_PHOTO_MAX_WIDTH = 750;

/** WebP quality: visually the same as Fragrantica's JPEGs at about half the bytes. */
export const PRODUCT_PHOTO_QUALITY = 80;

/**
 * The stored form of a product photo: WebP at quality 80, turned upright from
 * its EXIF orientation, and no wider than 750px (never enlarged, so
 * Fragrantica's 375px photos keep their size).
 */
export async function compressProductPhoto(input: ArrayBuffer | Buffer): Promise<Buffer> {
  return sharp(Buffer.isBuffer(input) ? input : Buffer.from(input))
    .rotate()
    .resize({ width: PRODUCT_PHOTO_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: PRODUCT_PHOTO_QUALITY })
    .toBuffer();
}

/** Downloads a photo from a link. Throws on a failed download or a non-image. */
export async function downloadPhoto(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Only https links can be downloaded");
  const response = await fetch(parsed, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; LeSillageManila/1.0)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`Not an image (${type || "no type"})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Image exceeds 8MB limit");
  return bytes;
}

/** Compresses a photo and stores it in Blob; returns its public URL. */
export async function storeProductPhoto(productId: string, input: ArrayBuffer | Buffer): Promise<string> {
  const webp = await compressProductPhoto(input);
  const bytes = webp.buffer.slice(webp.byteOffset, webp.byteOffset + webp.byteLength) as ArrayBuffer;
  const uploaded = await uploadPublicImage(`${PRODUCT_PHOTO_FOLDER}/${productId}`, {
    name: "photo.webp",
    type: "image/webp",
    bytes,
  });
  return uploaded.url;
}

/**
 * The URL to save for a photo picked by link (Fragrantica import, a pasted
 * image URL): our own compressed copy, or the original link if the copy
 * fails, so an import never fails over a photo. The migration script can
 * convert a fallen-back link later.
 */
export async function selfHostPhotoFromLink(productId: string, url: string): Promise<string> {
  try {
    return await storeProductPhoto(productId, await downloadPhoto(url));
  } catch (error) {
    console.error(`[product-photos] kept the original link for ${productId}:`, error);
    return url;
  }
}
