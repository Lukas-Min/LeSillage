import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BottlesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = (params.type ?? "").toUpperCase();
  if (type === "FULL_BOTTLE") redirect("/shop?type=FULL_BOTTLE");
  if (type === "PARTIAL") redirect("/shop?type=PARTIAL");
  redirect("/shop");
}
