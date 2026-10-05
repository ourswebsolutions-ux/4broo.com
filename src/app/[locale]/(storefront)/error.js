"use client";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { useT } from "@/i18n/I18nProvider";

// Storefront-level boundary: header and footer stay visible while the page area recovers.
// Only the opaque digest is shown so support can find the server log entry.
export default function StorefrontError({ error, retry }) {
  const t = useT();
  return (
    <div className="container-page flex flex-1 items-center justify-center py-20">
      <ErrorState
        title={t("system.errorTitle")}
        description={t("system.errorText")}
        reference={error?.digest}
        referenceLabel={t("system.reference")}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()}>{t("common.tryAgain")}</Button>
            <Button href="/" variant="secondary">
              {t("system.returnHome")}
            </Button>
          </div>
        }
      />
    </div>
  );
}
