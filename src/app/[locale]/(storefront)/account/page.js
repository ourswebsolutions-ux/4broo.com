import { OrderList } from "@/components/account/OrderList";
import { Icon } from "@/components/ui/Icon";
import { LOCALES } from "@/i18n/config";
import Link from "@/i18n/Link";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getDefaultAddress } from "@/services/addressService";
import { formatDate } from "@/utils/format";

async function getOverview(userId) {
  const db = getDb();
  const [profile, orders, orderCount, favourites, saved, cart, address] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true, phone: true, createdAt: true } }),
    db.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, orderNumber: true, createdAt: true, status: true, total: true, currency: true, payment: { select: { method: true, status: true } } } }),
    db.order.count({ where: { userId } }),
    db.wishlistItem.count({ where: { userId, product: { status: "PUBLISHED" } } }),
    db.savedItem.count({ where: { userId } }),
    db.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } }),
    getDefaultAddress(userId),
  ]);
  return { profile, orders, counts: { orderCount, favourites, saved, cart: cart._sum.quantity ?? 0 }, address };
}

export default async function AccountPage({ params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/account", locale }), getTranslator(locale)]);
  const { profile, orders, counts, address } = await getOverview(user.id);

  const tiles = [
    { label: t("account.orders"), value: counts.orderCount, href: "/account/orders", icon: "package" },
    { label: t("account.inBag"), value: counts.cart, href: "/cart", icon: "bag" },
    { label: t("account.favourites"), value: counts.favourites, href: "/wishlist", icon: "heart" },
    { label: t("account.saved"), value: counts.saved, href: "/account/saved", icon: "bookmark" },
  ];

  return (
    <div className="flex flex-col gap-14">
      <h1 className="sr-only">{t("account.overview")}</h1>

      <ul className="grid grid-cols-2 border-s border-t border-line xl:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.href} className="border-b border-e border-line">
            <Link href={tile.href} className="group flex h-full flex-col gap-6 p-5 transition-colors duration-300 hover:bg-bone sm:p-7">
              <span className="flex items-center justify-between">
                <span className="eyebrow !text-[0.625rem] text-mute">{tile.label}</span>
                <Icon name={tile.icon} className="size-4 text-mute transition-colors group-hover:text-gold-deep" />
              </span>
              <span className="font-display text-5xl font-light tabular-nums">{tile.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="details-title" className="flex flex-col gap-5 border border-line p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="details-title" className="eyebrow">
              {t("account.details")}
            </h2>
            <Link href="/account/profile" className="text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink">
              {t("commonActions.edit")}
            </Link>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-sm">
            <dt className="text-mute">{t("account.name")}</dt>
            <dd>
              {profile.firstName} {profile.lastName}
            </dd>
            <dt className="text-mute">{t("account.email")}</dt>
            <dd className="[overflow-wrap:anywhere]">
              <bdi dir="ltr">{profile.email}</bdi>
            </dd>
            <dt className="text-mute">{t("account.phone")}</dt>
            <dd>{profile.phone ? <bdi dir="ltr">+{profile.phone}</bdi> : <span className="text-mute">{t("account.notSet")}</span>}</dd>
          </dl>
          <p className="mt-auto text-xs text-mute">{t("account.memberSince", { date: formatDate(profile.createdAt, LOCALES[locale].numberingLocale) })}</p>
        </section>

        <section aria-labelledby="address-title" className="flex flex-col gap-5 border border-line p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="address-title" className="eyebrow">
              {t("account.defaultAddress")}
            </h2>
            <Link href="/account/addresses" className="text-xs text-subtle underline decoration-line underline-offset-4 hover:text-ink">
              {t("account.manage")}
            </Link>
          </div>
          {address ? (
            <address className="flex flex-col gap-1 text-sm not-italic leading-relaxed">
              <span className="font-medium">{address.fullName}</span>
              <span>{address.addressLine}</span>
              <span>{[address.city, address.postalCode].filter(Boolean).join(" ")}</span>
              <span>{address.country}</span>
              <bdi dir="ltr" className="text-subtle">
                +{address.phone}
              </bdi>
            </address>
          ) : (
            <p className="text-sm text-mute">{t("account.noAddress")}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="orders-title" className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between border-b border-ink pb-4">
          <h2 id="orders-title" className="headline text-title">
            {t("account.recent")}
          </h2>
          {counts.orderCount > orders.length ? (
            <Link href="/account/orders" className="text-xs text-subtle underline underline-offset-4 hover:text-ink">
              {t("search.viewAll")}
            </Link>
          ) : null}
        </div>
        <OrderList orders={orders} t={t} locale={locale} />
      </section>
    </div>
  );
}
