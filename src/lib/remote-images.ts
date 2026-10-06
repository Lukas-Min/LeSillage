/**
 * Photo hosts the Next image optimizer may fetch from: Fragrantica's image
 * CDN (imported product photos) and Vercel Blob (uploaded ones). next.config
 * builds images.remotePatterns from this list, so the two can't drift.
 */
export const OPTIMIZED_IMAGE_HOSTS = ["fimgs.net", "*.public.blob.vercel-storage.com"] as const;

/**
 * Product photos we compressed and stored ourselves (src/lib/product-photos.ts)
 * live under this Blob folder. They're already WebP at the right size, so
 * they're served as-is, not through the optimizer.
 */
export const PRODUCT_PHOTO_FOLDER = "product-photos";

export function isSelfHostedProductPhoto(url: string): boolean {
  return url.includes(`/public/${PRODUCT_PHOTO_FOLDER}/`);
}

/**
 * Whether a photo URL should go through the optimizer (re-encoded as WebP at
 * the size it's drawn). Our own compressed photos are served as-is, and so is
 * any other host: the optimizer refuses hosts outside remotePatterns, and a
 * refused photo would show as broken. What's left is a Fragrantica link or
 * an older upload not yet converted by `npm run photos:self-host`.
 */
export function canOptimizeImage(url: string): boolean {
  if (isSelfHostedProductPhoto(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return OPTIMIZED_IMAGE_HOSTS.some((host) =>
    host.startsWith("*.") ? parsed.hostname.endsWith(host.slice(1)) : parsed.hostname === host,
  );
}
