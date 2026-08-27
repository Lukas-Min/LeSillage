import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DecantsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ size?: string }>;
}) {
  const params = await searchParams;
  const size = params.size ? `&size=${encodeURIComponent(params.size)}` : "";
  redirect(`/shop?type=DECANT${size}`);
}
