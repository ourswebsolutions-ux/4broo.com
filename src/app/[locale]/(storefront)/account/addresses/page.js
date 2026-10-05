import { AddressBook } from "@/components/account/AddressBook";
import { getTranslator } from "@/i18n/server";
import { requireCustomer } from "@/lib/auth/guards";
import { listAddresses, MAX_ADDRESSES } from "@/services/addressService";

export default async function AddressesPage({ params }) {
  const { locale } = await params;
  const [user, t] = await Promise.all([requireCustomer({ redirectTo: "/account/addresses", locale }), getTranslator(locale)]);
  const addresses = await listAddresses(user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-ink pb-4">
        <h1 className="headline text-title">{t("address.title")}</h1>
        <p className="text-sm text-subtle">{t("address.intro")}</p>
      </div>
      <AddressBook addresses={addresses} max={MAX_ADDRESSES} />
    </div>
  );
}
