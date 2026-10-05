"use client";

import { useRef, useState, useTransition } from "react";
import { placeOrderAction } from "@/actions/checkout";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { ImagePlaceholder, SmartImage } from "@/components/media/SmartImage";
import { Money } from "@/components/shop/Money";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { buttonClasses } from "@/components/ui/Button";
import { useLocale, useT } from "@/i18n/I18nProvider";
import Link from "@/i18n/Link";
import { formatMoney } from "@/lib/currency/money";
import { cn } from "@/utils/cn";

function Section({ index, title, intro, children }) {
  return (
    <section aria-labelledby={`step-${index}`} className="flex animate-[fade_500ms_ease-out_both] flex-col gap-7 border-t border-ink pt-7" style={{ animationDelay: `${index * 60}ms` }}>
      <header className="flex items-baseline gap-4">
        <span className="font-display text-sm tabular-nums text-gold-deep" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id={`step-${index}`} className="eyebrow">
            {title}
          </h2>
          {intro ? <p className="text-sm text-subtle">{intro}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Selectable card (radio) used for saved addresses and payment methods. */
function ChoiceCard({ name, value, checked, onChange, disabled, title, children, aside }) {
  return (
    <label
      className={cn(
        "group/choice relative flex cursor-pointer gap-4 border p-5 transition-[border-color,background-color,box-shadow] duration-300 ease-(--ease-luxe)",
        checked ? "border-ink bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line hover:border-mute",
        disabled && "cursor-not-allowed opacity-55 hover:border-line",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
          checked ? "border-ink" : "border-mute",
        )}
      >
        <span className={cn("size-2 rounded-full bg-ink transition-[scale] duration-300 ease-(--ease-luxe)", checked ? "scale-100" : "scale-0")} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        {children}
      </span>
      {aside ? <span className="shrink-0 text-sm">{aside}</span> : null}
    </label>
  );
}

function Summary({ lines, subtotal, quote, t }) {
  const { currency } = useCurrency();
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-5">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-4">
            <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-bone">
              {line.image ? <SmartImage src={line.image} alt="" fill sizes="64px" className="object-cover" /> : <ImagePlaceholder className="absolute inset-0" />}
              <span className="absolute -end-0 -top-0 grid min-w-5 place-items-center bg-ink px-1 text-[0.625rem] leading-5 tabular-nums text-paper">{line.quantity}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm leading-snug">{line.name}</span>
              <span className="text-xs text-subtle">{[line.size, line.color].filter(Boolean).join(" · ")}</span>
              <span className="text-xs text-mute">{t("checkout.qty", { count: line.quantity })}</span>
            </span>
            <Money value={line.lineTotal} className="shrink-0 text-end text-sm" />
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-3 border-t border-line pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">{t("checkout.subtotal")}</dt>
          <dd>
            <Money value={subtotal} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-subtle">{t("checkout.deliveryFee")}</dt>
          <dd className="text-end">{!quote.confirmed ? <span className="text-subtle">{t("checkout.tbc")}</span> : quote.free ? t("checkout.free") : <Money value={quote.fee} />}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <dt className="eyebrow">{t("checkout.total")}</dt>
          <dd className="text-end text-xl font-medium">
            <Money value={quote.total} showBase />
          </dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-mute">
        {t("checkout.chargedIn", { amount: formatMoney(quote.total.amount, "PKR") })}
        {currency === "USD" ? ` ${t("checkout.usdEstimate")}` : ""}
      </p>
    </div>
  );
}

/**
 * Checkout form. Submits via a Server Action called from onSubmit (no automatic
 * form reset, so nothing typed is lost on a validation error). Totals shown are
 * the server's; the server recomputes them again when the order is placed.
 */
export function CheckoutForm({ idempotencyKey, profile, addresses, lines, subtotal, quotes, domesticCountry, paymentMethods }) {
  const t = useT();
  const locale = useLocale();
  const { currency } = useCurrency();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(null);
  const errorRef = useRef(null);
  const submitting = useRef(false); // synchronous guard: rapid clicks fire before React re-renders

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "new");
  const [newCountry, setNewCountry] = useState(domesticCountry);
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [payment, setPayment] = useState("COD");

  const errors = state?.fieldErrors ?? {};
  const values = state?.values ?? {};
  const country = addressId === "new" ? newCountry : addresses.find((address) => address.id === addressId)?.country;
  const quote = String(country ?? "").trim().toLowerCase() === domesticCountry.toLowerCase() ? quotes.domestic : quotes.international;

  const onSubmit = (event) => {
    event.preventDefault();
    if (submitting.current) return; // double-click guard (the server is idempotent as well)
    submitting.current = true;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await placeOrderAction(null, formData);
        // Success redirects (the page unloads); only failures come back here.
        if (result) {
          submitting.current = false;
          setState(result);
          requestAnimationFrame(() => errorRef.current?.focus());
        }
      } catch (error) {
        submitting.current = false;
        throw error;
      }
    });
  };

  const summaryProps = { lines, subtotal, quote, t };

  return (
    <div className="container-page pb-24 pt-8 sm:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
        <div className="flex flex-col gap-3">
          <p className="eyebrow flex items-center gap-3 text-gold-deep">
            <span className="rule-gold" aria-hidden="true" />
            {t("checkout.secure")}
          </p>
          <h1 className="headline text-display-sm">{t("checkout.title")}</h1>
        </div>
        <Link href="/cart" className="inline-flex min-h-11 items-center gap-2 text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink">
          <Icon name="arrowRight" className="size-3.5 -scale-x-100 rtl:scale-x-100" />
          {t("checkout.backToBag")}
        </Link>
      </div>

      {/* Mobile: collapsible summary first, so the total is always visible. */}
      <details className="group/summary mb-10 border border-line lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm">
            <Icon name="bag" className="size-4 text-gold-deep" />
            {t("checkout.summary")}
            <Icon name="chevronDown" className="size-3.5 transition-transform duration-300 group-open/summary:rotate-180" />
          </span>
          <Money value={quote.total} className="text-sm font-medium" />
        </summary>
        <div className="border-t border-line p-5">
          <Summary {...summaryProps} />
        </div>
      </details>

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_27rem] xl:gap-24">
        <div className="flex min-w-0 flex-col gap-12">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="displayCurrency" value={currency} />

          {state && !state.ok ? (
            <div ref={errorRef} tabIndex={-1} className="outline-none">
              <Alert tone="error">{Object.keys(errors).length ? t("checkout.errorSummary") : state.message}</Alert>
            </div>
          ) : null}

          <Section index={1} title={t("checkout.contact")} intro={t("checkout.contactIntro")}>
            <Field label={t("checkout.fullName")} name="fullName" autoComplete="name" required maxLength={160} defaultValue={values.fullName ?? profile.fullName} error={errors.fullName} />
            <div className="grid gap-7 sm:grid-cols-2">
              <Field label={t("checkout.email")} name="email" type="email" dir="ltr" autoComplete="email" required defaultValue={values.email ?? profile.email} error={errors.email} />
              <Field
                label={t("checkout.phone")}
                name="phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+92 300 1234567"
                required
                hint={t("checkout.phoneHint")}
                defaultValue={values.phone ?? profile.phone}
                error={errors.phone}
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={whatsappSame} onChange={(event) => setWhatsappSame(event.target.checked)} className="size-4.5 accent-ink" />
              {t("checkout.whatsappSame")}
            </label>
            {whatsappSame ? null : (
              <Field
                label={`${t("checkout.whatsapp")} (${t("checkout.optional")})`}
                name="whatsappNumber"
                type="tel"
                dir="ltr"
                inputMode="tel"
                placeholder="+92 300 1234567"
                hint={t("checkout.whatsappHint")}
                defaultValue={values.whatsappNumber ?? ""}
                error={errors.whatsappNumber}
              />
            )}
            {whatsappSame ? <WhatsappMirror /> : null}
          </Section>

          <Section index={2} title={t("checkout.delivery")}>
            {addresses.length ? (
              <fieldset className="flex flex-col gap-3">
                <legend className="eyebrow mb-4 !text-[0.625rem] text-mute">{t("checkout.savedAddresses")}</legend>
                {addresses.map((address) => (
                  <ChoiceCard
                    key={address.id}
                    name="addressId"
                    value={address.id}
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                    title={address.fullName}
                    aside={address.isDefault ? <span className="eyebrow bg-ink px-2 py-1 !text-[0.5625rem] text-paper">{t("address.default")}</span> : null}
                  >
                    <span className="text-sm leading-relaxed text-subtle">
                      {address.addressLine}, {[address.city, address.postalCode].filter(Boolean).join(" ")}, {address.country}
                    </span>
                    <bdi dir="ltr" className="text-xs text-mute">
                      {address.phone}
                    </bdi>
                  </ChoiceCard>
                ))}
                <ChoiceCard name="addressId" value="" checked={addressId === "new"} onChange={() => setAddressId("new")} title={t("checkout.newAddress")} />
                {errors.addressId ? <p className="text-sm text-danger">{errors.addressId.join(" ")}</p> : null}
              </fieldset>
            ) : null}

            {addressId === "new" ? (
              <div className="flex animate-[fade_350ms_ease-out_both] flex-col gap-7">
                <Field label={t("checkout.addressLine")} name="addressLine" autoComplete="street-address" required maxLength={255} hint={t("checkout.addressHint")} defaultValue={values.addressLine ?? ""} error={errors.addressLine} />
                <div className="grid gap-7 sm:grid-cols-3">
                  <Field label={t("checkout.city")} name="city" autoComplete="address-level2" required maxLength={100} defaultValue={values.city ?? ""} error={errors.city} />
                  <Field label={`${t("checkout.postalCode")} (${t("checkout.optional")})`} name="postalCode" dir="ltr" autoComplete="postal-code" maxLength={20} defaultValue={values.postalCode ?? ""} error={errors.postalCode} />
                  <Field
                    label={t("checkout.country")}
                    name="country"
                    autoComplete="country-name"
                    required
                    maxLength={60}
                    value={newCountry}
                    onChange={(event) => setNewCountry(event.target.value)}
                    error={errors.country}
                  />
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" name="saveAddress" defaultChecked={values.saveAddress === "on" || !addresses.length} className="size-4.5 accent-ink" />
                  {t("checkout.saveAddress")}
                </label>
              </div>
            ) : null}
          </Section>

          <Section index={3} title={t("checkout.shipping")}>
            <input type="hidden" name="deliveryMethod" value="STANDARD" />
            <div className="flex items-start justify-between gap-4 border border-ink p-5 shadow-[inset_0_0_0_1px_var(--color-ink)]">
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t("checkout.standard")}</span>
                {!quote.confirmed ? <span className="max-w-md text-xs leading-relaxed text-subtle">{t("checkout.tbcText")}</span> : null}
              </span>
              <span className="shrink-0 text-sm">{!quote.confirmed ? <span className="text-subtle">{t("checkout.tbc")}</span> : quote.free ? t("checkout.free") : <Money value={quote.fee} />}</span>
            </div>
          </Section>

          <Section index={4} title={t("checkout.payment")}>
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">{t("checkout.payment")}</legend>
              {paymentMethods.map((option) => (
                <ChoiceCard
                  key={option.method}
                  name="paymentMethod"
                  value={option.method}
                  checked={payment === option.method}
                  onChange={() => setPayment(option.method)}
                  disabled={!option.available}
                  title={t(option.method === "COD" ? "checkout.cod" : "checkout.paynow")}
                  aside={<Icon name={option.method === "COD" ? "package" : "lock"} className="size-4.5 text-mute" />}
                >
                  <span className="text-xs leading-relaxed text-subtle">
                    {option.available ? t(option.method === "COD" ? "checkout.codText" : "checkout.paynowText") : t("checkout.unavailable")}
                  </span>
                </ChoiceCard>
              ))}
              {errors.paymentMethod ? <p className="text-sm text-danger">{errors.paymentMethod.join(" ")}</p> : null}
            </fieldset>
          </Section>

          <Section index={5} title={t("checkout.review")}>
            <div className="flex flex-col gap-2">
              <label htmlFor="customerNote" className="eyebrow text-subtle">
                {t("checkout.note")}
              </label>
              <textarea
                id="customerNote"
                name="customerNote"
                rows={3}
                maxLength={1000}
                defaultValue={values.customerNote ?? ""}
                placeholder={t("checkout.noteHint")}
                className="w-full resize-y border border-line bg-transparent p-4 text-sm outline-none transition-colors duration-300 placeholder:text-mute focus:border-ink"
              />
            </div>
            <button type="submit" disabled={pending} aria-busy={pending || undefined} className={buttonClasses({ size: "lg", fullWidth: true, className: "lg:hidden" })}>
              {pending ? <Spinner /> : <Icon name="lock" className="size-4" />}
              {pending ? t("checkout.placing") : t("checkout.placeOrder")}
            </button>
            <Agreement t={t} className="lg:hidden" />
          </Section>
        </div>

        {/* Desktop summary + the primary action */}
        <aside aria-label={t("checkout.summary")} className="hidden flex-col gap-6 border border-line bg-paper p-7 lg:sticky lg:top-28 lg:flex xl:p-9">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">{t("checkout.summary")}</h2>
            <Link href="/cart" className="text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink">
              {t("checkout.editBag")}
            </Link>
          </div>
          <Summary {...summaryProps} />
          <button type="submit" disabled={pending} aria-busy={pending || undefined} className={buttonClasses({ size: "lg", fullWidth: true })}>
            {pending ? <Spinner /> : <Icon name="lock" className="size-4" />}
            {pending ? t("checkout.placing") : t("checkout.placeOrder")}
          </button>
          <Agreement t={t} />
        </aside>
      </form>
    </div>
  );
}

/** With "same as phone", the WhatsApp number is the phone number (the server normalises both). */
function WhatsappMirror() {
  return <input type="hidden" name="whatsappSame" value="1" />;
}

function Agreement({ t, className }) {
  const [before, rest] = t("checkout.agreement").split("{terms}");
  const [middle, after] = (rest ?? "").split("{privacy}");
  return (
    <p className={cn("text-center text-xs leading-relaxed text-mute", className)}>
      {before}
      <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
        {t("checkout.terms")}
      </Link>
      {middle}
      <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-ink">
        {t("checkout.privacy")}
      </Link>
      {after}
    </p>
  );
}
