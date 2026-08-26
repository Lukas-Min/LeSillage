import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  fallback,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: {
  src: string | null;
  alt: string;
  fallback: string;
  className?: string;
  sizes?: string;
}) {
  const isSvg = src?.toLowerCase().includes(".svg") ?? false;
  return (
    <div className={cn("relative overflow-hidden bg-cream-foreground/5", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={isSvg || src.startsWith("http") === false}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full min-h-[12rem] items-center justify-center px-4 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {fallback}
        </div>
      )}
    </div>
  );
}
