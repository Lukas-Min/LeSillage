import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShopRedirect({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; size?: string }>;
}) {
  const params = await searchParams;
  const type = (params.type ?? "").toUpperCase();
  if (type === "DECANT") {
    const size = params.size ? `?size=${encodeURIComponent(params.size)}` : "";
    redirect(`/decants${size}`, "replace");
  }
  if (type === "PARTIAL") {
    redirect("/bottles?type=PARTIAL", "replace");
  }
  if (type === "FULL_BOTTLE") {
    redirect("/bottles?type=FULL_BOTTLE", "replace");
  }
  redirect("/bottles", "replace");
}
