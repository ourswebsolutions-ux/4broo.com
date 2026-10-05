"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

// Pages with their own WhatsApp / checkout actions, where a floating button would cover content.
const HIDDEN_ON = /^\/(?:(?:ur|hi)\/)?(?:products\/|cart(?:\/|$))/;

/**
 * Floating WhatsApp chat link (wa.me). Uses only the public contact number —
 * no WAAPI credentials are involved; automated WhatsApp messaging stays server-side.
 * Renders nothing when no number is configured.
 */
export function WhatsAppButton({ number, message, label, hoverLabel }) {
  const pathname = usePathname();
  if (!number || HIDDEN_ON.test(pathname)) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-3 z-30 flex items-center sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:end-6"
    >
      <span className="eyebrow pointer-events-none me-3 hidden translate-x-2 rtl:-translate-x-2 bg-ink px-3 py-2 text-paper opacity-0 transition-[opacity,translate] duration-300 ease-(--ease-luxe) group-hover:translate-x-0 rtl:group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block">
        {hoverLabel}
      </span>
      <span className="grid size-12 place-items-center rounded-full bg-ink text-gold shadow-[0_8px_30px_rgb(11_11_10/0.25)] ring-1 ring-gold/40 transition-[translate,background-color,box-shadow] duration-300 ease-(--ease-luxe) group-hover:-translate-y-0.5 group-hover:bg-ink-soft group-hover:ring-gold group-active:scale-95 sm:size-14">
        <Icon name="whatsapp" className="size-5 sm:size-6" />
      </span>
    </a>
  );
}
