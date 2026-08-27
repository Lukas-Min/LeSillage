import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountBottomNav, AccountSidebar } from "@/components/store/account-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "CUSTOMER";
  if (!session?.user) redirect("/sign-in?returnTo=/admin");
  if (role !== "ADMIN") redirect("/account");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-24 md:flex-row md:gap-8 md:py-10">
      <AccountSidebar isAdmin />
      <main className="min-w-0 flex-1">{children}</main>
      <AccountBottomNav />
    </div>
  );
}
