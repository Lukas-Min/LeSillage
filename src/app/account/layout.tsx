import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mergeGuestCartIntoUser } from "@/actions/cart-actions";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?returnTo=/account");
  await mergeGuestCartIntoUser();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row">
      <aside className="w-full sm:w-48">
        <nav className="flex flex-col gap-2 text-sm">
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/account">Profile</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/account/orders">Orders</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/account/addresses">Addresses</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/account/wishlist">Wishlist</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start">
            <Link href="/api/auth/signout">Sign out</Link>
          </Button>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}