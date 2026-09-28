import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountBottomNav, AccountSidebar, SectionBreadcrumbs } from "@/components/store/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account");
  const role = (session.user as { role?: string } | undefined)?.role ?? "CUSTOMER";
  const isAdmin = role === "ADMIN";
  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 pb-24 md:py-10 2xl:mx-auto 2xl:max-w-[80vw]">
      <SectionBreadcrumbs />
      <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row md:gap-8">
        <AccountSidebar isAdmin={isAdmin} />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      <AccountBottomNav />
    </div>
  );
}