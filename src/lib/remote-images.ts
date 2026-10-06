/**
 * Photo hosts the Next image optimizer may fetch from: Fragrantica's image
 * CDN (imported product photos) and Vercel Blob (uploaded ones). next.config
 * builds images.remotePatterns from this list, so the two can't drift.
 */
export const OPTIMIZED_IMAGE_HOSTS = ["fimgs.net", "*.public.blob.vercel-storage.com"] as const;

/**
 * Whether a photo URL can go through the optimizer (re-encoded as WebP at the
 * size it's drawn). Any other host is shown as-is: the optimizer refuses
 * hosts outside remotePatterns, and a refused photo would show as broken.
 */
export function canOptimizeImage(url: string): boolean {
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
