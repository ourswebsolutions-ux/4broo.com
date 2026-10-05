"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";

/**
 * Checkout entry point. Disabled (with the reason) while an item in the bag is
 * unavailable or over stock — the checkout page re-validates everything anyway.
 */
export function CheckoutButton({ hasIssues = false, onNavigate }) {
  const t = useT();
  const noteId = useId();

  if (hasIssues) {
    return (
      <div className="flex flex-col gap-2">
        <Button fullWidth size="lg" disabled aria-describedby={noteId}>
          <Icon name="lock" className="size-4" />
          {t("cart.checkout")}
        </Button>
        <p id={noteId} className="text-center text-xs leading-relaxed text-danger">
          {t("checkout.issues")}
        </p>
      </div>
    );
  }

  return (
    <Button href="/checkout" fullWidth size="lg" onClick={onNavigate}>
      <Icon name="lock" className="size-4" />
      {t("cart.checkout")}
    </Button>
  );
}
