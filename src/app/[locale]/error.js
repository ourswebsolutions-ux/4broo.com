"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/I18nProvider";

// Rendered for unexpected errors outside the storefront group (auth, checkout).
// Next.js strips error details in production; only the opaque digest is shown.
export default function ErrorBoundary({ error, retry }) {
  const t = useT();
  return (
    <div className="container-page flex flex-1 flex-col justify-center gap-8 py-24">
      <p className="eyebrow text-mute">{t("system.errorEyebrow")}</p>
      <h1 className="headline text-display-sm">{t("system.errorTitle")}</h1>
      <p className="max-w-md text-sm leading-relaxed text-subtle">
        {t("system.errorText")}
        {error?.digest ? <span className="mt-2 block text-mute">{t("system.reference", { id: error.digest })}</span> : null}
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => retry()}>{t("common.tryAgain")}</Button>
        <Button href="/" variant="secondary">
          {t("system.returnHome")}
        </Button>
      </div>
    </div>
  );
}
