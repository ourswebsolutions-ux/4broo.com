import { SavedView } from "@/components/account/SavedView";
import { getTranslator } from "@/i18n/server";

export default async function SavedPage({ params }) {
  const t = await getTranslator((await params).locale);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-ink pb-4">
        <h1 className="headline text-title">{t("saved.title")}</h1>
      </div>
      <SavedView />
    </div>
  );
}
