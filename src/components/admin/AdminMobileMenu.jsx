"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/utils/cn";
import { NAV_ITEMS, isActive } from "./AdminNav";

/** Compact admin navigation for phones and tablets: current section + a slide-in menu. */
export function AdminMobileMenu({ admin }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => isActive(item, pathname));

  return (
    <>
      <span className="eyebrow truncate text-mute">{current?.label ?? "Admin"}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="eyebrow ms-auto flex h-11 items-center gap-2 border border-ink px-4 !text-[0.625rem] hover:bg-ink hover:text-paper"
      >
        <Icon name="menu" className="size-4" />
        Menu
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} label="Admin menu" side="start" className="max-w-xs">
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-16">
          <p className="eyebrow mb-4 text-mute">4 BRO Admin</p>
          <nav aria-label="Admin" className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn("flex min-h-14 items-center justify-between border-b border-line font-display text-2xl font-light", active ? "text-ink" : "text-ink/70 hover:text-ink")}
                >
                  {item.label}
                  {active ? <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-4 pt-10">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {admin.firstName} {admin.lastName}
              </p>
              <p className="truncate text-xs text-mute">{admin.email}</p>
            </div>
            <form action={logoutAction}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Signing out">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>
      </Drawer>
    </>
  );
}
