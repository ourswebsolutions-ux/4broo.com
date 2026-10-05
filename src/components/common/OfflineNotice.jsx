"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/I18nProvider";

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Small persistent notice shown only while the browser reports no connection. */
export function OfflineNotice() {
  const t = useT();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md animate-reveal items-center gap-3 bg-ink px-5 py-4 text-sm text-paper shadow-lg sm:bottom-6"
    >
      <Icon name="wifiOff" className="text-gold" />
      <span>{t("system.offline")}</span>
    </div>
  );
}
