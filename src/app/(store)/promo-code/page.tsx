import { notFound } from "next/navigation";
import { CopyPromoCode } from "@/components/store/copy-promo-code";

export default async function PromoCodeCopyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const normalized = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,40}$/.test(normalized)) notFound();

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
      <h1 className="font-serif-display text-3xl">Your promo code</h1>
      <CopyPromoCode code={normalized} />
    </main>
  );
}
