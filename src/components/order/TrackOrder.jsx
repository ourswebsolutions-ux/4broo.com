"use client";

import { useActionState } from "react";
import { trackOrderAction } from "@/actions/tracking";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { localizeHref } from "@/i18n/navigation";
import { OrderTimeline, formatOrderDateTime } from "./OrderParts";

/** Order-number + email lookup with a progress timeline. */
export function TrackOrder({ initialNumber = "" }) {
  const t = useT();
  const locale = useLocale();
  const [state, action] = useActionState(trackOrderAction, undefined);
  const order = state?.ok ? state.order : null;

  if (order) {
    return (
      <div className="flex animate-[fade_450ms_ease-out_both] flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow !text-[0.625rem] text-mute">{t("order.number")}</span>
            <bdi dir="ltr" className="font-[family-name:var(--font-manrope)] text-xl font-medium tabular-nums tracking-[0.08em]">{order.orderNumber}</bdi>
          </div>
          <p className="text-sm text-subtle">
            {t(order.itemCount === 1 ? "order.itemCountOne" : "order.itemCount", { count: order.itemCount })} · {order.city}
          </p>
        </div>
        <OrderTimeline order={order} t={t} locale={locale} />
        <p className="text-xs text-mute">{t("tracking.lastUpdate", { date: formatOrderDateTime(order.updatedAt, locale) })}</p>
        {/* full load resets the lookup form */}
        <a href={localizeHref("/track-order", locale)} className={buttonClasses({ variant: "secondary", className: "self-start" })}>
          {t("tracking.another")}
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-7" noValidate>
      {state?.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="locale" value={locale} />
      <Field label={t("tracking.orderNumber")} name="orderNumber" dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="4BRO-20261003-XXXXXX" required defaultValue={state?.values?.orderNumber ?? initialNumber} />
      <Field label={t("tracking.email")} name="email" type="email" dir="ltr" autoComplete="email" required defaultValue={state?.values?.email ?? ""} />
      <SubmitButton pendingLabel={t("tracking.searching")}>{t("tracking.submit")}</SubmitButton>
    </form>
  );
}
