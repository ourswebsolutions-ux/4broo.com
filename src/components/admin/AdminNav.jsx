"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

export const NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/settings", label: "Settings" },
];

export const isActive = (item, pathname) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

/** Desktop sidebar navigation. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1 px-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn("eyebrow whitespace-nowrap px-4 py-3 transition-colors", active ? "bg-ink text-paper" : "text-ink/75 hover:bg-bone hover:text-ink")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
