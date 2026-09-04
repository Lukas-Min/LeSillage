import { redirect } from "next/navigation";

// Merged into /admin/promo (the "Promo codes" tab) — kept as a redirect so
// old bookmarks/links still land somewhere useful.
export default function PromoCodesRedirect() {
  redirect("/admin/promo?tab=codes");
}
