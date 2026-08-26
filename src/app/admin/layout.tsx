import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { adminSignOut } from "@/actions/admin-actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "CUSTOMER";
  if (!session?.user) redirect("/sign-in?returnTo=/admin");
  if (role !== "ADMIN") redirect("/account");
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row">
      <aside className="w-full sm:w-56">
        <nav className="flex flex-col gap-2 text-sm">
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/orders">Orders</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/products">Products</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/customers">Customers</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/audit">Audit log</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/promo">Promo & delivery</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/qr">QR codes</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/admin/settings">Settings</Link>
          </Button>
          <form action={adminSignOut}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
