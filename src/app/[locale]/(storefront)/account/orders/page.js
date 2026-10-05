import { OrderList } from "@/components/account/OrderList";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

// Orders foundation: lists the customer's real orders. Ordering itself arrives with checkout.
export default async function OrdersPage({ params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/account/orders", locale }), getTranslator(locale)]);
  const orders = await getDb().order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, orderNumber: true, createdAt: true, status: true, total: true, currency: true, payment: { select: { method: true, status: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="headline border-b border-ink pb-4 text-title">{t("account.orders")}</h1>
      <OrderList orders={orders} t={t} locale={locale} />
    </div>
  );
}
