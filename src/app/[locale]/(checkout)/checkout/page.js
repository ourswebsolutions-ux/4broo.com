import { randomUUID } from "node:crypto";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BASE_CURRENCY } from "@/config/currency";
import { getUsdRate } from "@/data/catalog";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { addMoney, convertMoney } from "@/lib/currency/money";
import { getDb } from "@/lib/db";
import { listPaymentMethods } from "@/lib/payments";
import { DOMESTIC_COUNTRY, quoteDelivery } from "@/lib/shipping";
import { listAddresses } from "@/services/addressService";
import { previewCheckout } from "@/services/orderService";

export async function generateMetadata({ params }) {
  const t = await getTranslator((await params).locale);
  return { title: t("checkout.title"), robots: { index: false } };
}

/** Per-customer page: the bag is re-validated and priced on the server on every visit. */
export default async function CheckoutPage({ params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/checkout", locale }), getTranslator(locale)]);

  let preview;
  try {
    preview = await previewCheckout(user.id);
  } catch (error) {
    const empty = error.i18n?.key === "errors.cartEmpty";
    return (
      <section className="container-page section-y-sm">
        <EmptyState
          icon="bag"
          title={empty ? t("checkout.empty") : t("checkout.issues")}
          description={empty ? t("checkout.emptyText") : t("errors.stockChanged")}
          action={<Button href={empty ? "/collections/new-arrivals" : "/cart"} arrow>{empty ? t("cart.continue") : t("checkout.reviewBag")}</Button>}
        />
      </section>
    );
  }

  const [profile, addresses, usdRate] = await Promise.all([
    getDb().user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, email: true, phone: true } }),
    listAddresses(user.id),
    getUsdRate(),
  ]);

  const money = (amount) => ({ amount, currency: BASE_CURRENCY, usd: usdRate ? convertMoney(amount, usdRate) : null });
  const { subtotal } = preview.totals;
  const quoteFor = (country) => {
    const delivery = quoteDelivery({ country, subtotal });
    return { confirmed: delivery.confirmed, free: delivery.free, fee: money(delivery.fee), total: money(addMoney(subtotal, delivery.fee)) };
  };

  return (
    <CheckoutForm
      idempotencyKey={randomUUID()}
      profile={{
        fullName: `${profile.firstName} ${profile.lastName}`.trim(),
        email: profile.email,
        // Profile phone first, else the default address's phone (filled at a previous checkout).
        phone: profile.phone ? `+${profile.phone}` : addresses[0]?.phone ? `+${addresses[0].phone}` : "",
      }}
      addresses={addresses.map((address) => ({ ...address, phone: `+${address.phone}` }))}
      lines={preview.lines.map((line) => ({
        key: line.variantId,
        name: line.productName,
        image: line.imageUrl,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
        lineTotal: money(line.lineTotal),
      }))}
      subtotal={money(subtotal)}
      quotes={{ domestic: quoteFor(DOMESTIC_COUNTRY), international: quoteFor("International") }}
      domesticCountry={DOMESTIC_COUNTRY}
      paymentMethods={listPaymentMethods()}
    />
  );
}
