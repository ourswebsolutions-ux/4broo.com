import Link from "@/i18n/Link";

/** Slim brand message above the header. Copy is localised by the storefront layout (dictionaries: announcement.*). */
export function AnnouncementBar({ message, link }) {
  if (!message) return null;

  return (
    <div className="bg-ink-soft text-mist">
      <div className="container-page flex min-h-10 items-center justify-center gap-x-4 py-2 text-center">
        <p className="eyebrow !text-[0.625rem] !tracking-[0.24em]">
          <span>{message}</span>
          {link ? (
            <>
              <span aria-hidden="true" className="mx-3 hidden text-graphite sm:inline">
                |
              </span>
              <Link
                href={link.href}
                className="ms-3 inline-block py-1.5 text-gold underline-offset-4 transition-colors hover:text-gold-light hover:underline sm:ms-0"
              >
                {link.label}
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
