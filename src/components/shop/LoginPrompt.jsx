"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";

const COPY = {
  wishlist: { icon: "heart", title: "auth.promptFavoriteTitle", text: "auth.promptFavoriteText" },
  cart: { icon: "bag", title: "auth.promptCartTitle", text: "auth.promptCartText" },
};

function PromptLinks({ onClose }) {
  const t = useT();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  // Come back to exactly this page; the remembered action is then completed.
  const next = encodeURIComponent(`${pathname}${query ? `?${query}` : ""}`);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href={`/login?next=${next}`} fullWidth onClick={onClose}>
        {t("auth.signIn")}
      </Button>
      <Button href={`/register?next=${next}`} variant="secondary" fullWidth onClick={onClose}>
        {t("auth.createAccount")}
      </Button>
    </div>
  );
}

/** Calm, non-blocking explanation for guests who tap "Add to bag" or the heart. */
export function LoginPrompt({ kind, onClose }) {
  const t = useT();
  const copy = COPY[kind] ?? COPY.wishlist;

  return (
    <Drawer open={Boolean(kind)} onClose={onClose} label={t(copy.title)} side="modal" closeLabel={t("common.close")}>
      <div className="flex flex-col gap-6 px-6 pb-8 pt-10 sm:px-10 sm:pb-10">
        <span className="grid size-12 place-items-center rounded-full border border-line">
          <Icon name={copy.icon} className="size-5 text-gold-deep" />
        </span>
        <div className="flex flex-col gap-2.5">
          <h2 className="headline text-[1.75rem] leading-tight sm:text-[2rem]">{t(copy.title)}</h2>
          <p className="text-sm leading-relaxed text-subtle">{t(copy.text)}</p>
        </div>
        <Suspense fallback={null}>
          <PromptLinks onClose={onClose} />
        </Suspense>
      </div>
    </Drawer>
  );
}
