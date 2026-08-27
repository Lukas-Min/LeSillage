"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/store/sign-out-overlay";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Bell,
  Trash2,
  LayoutDashboard,
  Package,
  Users,
  ScrollText,
  Tag,
  QrCode,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AccountNavItem = {
  href: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  destructive?: boolean;
};

export const accountNavItems: AccountNavItem[] = [
  { href: "/account", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: ShoppingBag },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/delete", label: "Delete account", icon: Trash2, destructive: true },
];

export const adminNavItems: AccountNavItem[] = [
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/promo", label: "Promo & delivery", icon: Tag },
  { href: "/admin/qr", label: "QR codes", icon: QrCode },
  { href: "/admin/settings", label: "Admin settings", icon: Settings },
];

function isActive(pathname: string, item: AccountNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

const adminHomeItem: AccountNavItem = { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true };

function NavList({ items, pathname }: { items: AccountNavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-gold/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                item.destructive && !active ? "text-destructive/80 hover:bg-destructive/5" : "",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AccountSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [adminHomeItem, ...adminNavItems] : accountNavItems;
  return (
    <nav className="hidden w-56 shrink-0 md:block">
      <NavList items={items} pathname={pathname ?? ""} />
      {isAdmin ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <Link
            href="/account"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="h-4 w-4" />
            <span>My account</span>
          </Link>
        </div>
      ) : null}
      <div className="pt-2">
        <SignOutButton variant="outline" className="w-full justify-start" />
      </div>
    </nav>
  );
}

export function SectionBreadcrumbs({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "";
  const rootHref = isAdmin ? "/admin" : "/account";
  const rootLabel = isAdmin ? "Admin" : "Account";
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }, { label: rootLabel, href: rootHref }];

  if (pathname === rootHref) {
    return <Breadcrumbs items={items} />;
  }

  const candidates = isAdmin ? [adminHomeItem, ...adminNavItems] : accountNavItems;
  const match = candidates
    .filter((item) => item.href !== rootHref && (pathname === item.href || pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) {
    const trailing = pathname.slice(match.href.length).replace(/^\//, "");
    items.push(trailing ? { label: match.label, href: match.href } : { label: match.label });
    if (trailing) items.push({ label: decodeURIComponent(trailing) });
  }

  return <Breadcrumbs items={items} />;
}

export function AccountBottomNav() {
  const pathname = usePathname();
  const inAdmin = pathname?.startsWith("/admin") ?? false;
  const items = inAdmin
    ? [adminHomeItem, ...adminNavItems]
    : accountNavItems.filter((item) => !item.destructive);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul
        className={cn(
          "mx-auto flex max-w-6xl items-stretch px-2 py-1",
          inAdmin ? "gap-1 overflow-x-auto" : "justify-around",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname ?? "", item);
          return (
            <li key={item.href} className={inAdmin ? "shrink-0" : "flex-1"}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-3 text-[11px] font-medium whitespace-nowrap transition-colors",
                  active ? "text-gold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
