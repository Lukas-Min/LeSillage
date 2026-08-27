"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LogOut,
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Bell,
  Trash2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

function isActive(pathname: string, item: AccountNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AccountSidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 md:block">
      <ul className="space-y-1">
        {accountNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname ?? "", item);
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
        <li className="pt-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </li>
      </ul>
    </nav>
  );
}

export function AccountBottomNav() {
  const pathname = usePathname();
  const items = accountNavItems.filter((item) => !item.destructive);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-6xl items-stretch justify-around px-2 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname ?? "", item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium transition-colors",
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

export function AccountSignOutButton({
  variant = "outline",
  className,
}: {
  variant?: "default" | "outline" | "ghost" | "destructive";
  className?: string;
}) {
  return (
    <Button
      variant={variant}
      className={className}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}