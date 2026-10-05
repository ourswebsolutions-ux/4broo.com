import Image from "next/image";
import Link from "@/i18n/Link";
import { cn } from "@/utils/cn";

/**
 * Banner for listing/content pages: breadcrumb, eyebrow, title, description and
 * an optional editorial image (rendered dark with the image to the right).
 */
export function PageHeader({ title, eyebrow, description, breadcrumbs = [], image, homeLabel = "Home", breadcrumbLabel = "Breadcrumb", children }) {
  const dark = Boolean(image);

  return (
    <section className={cn(dark ? "bg-ink text-paper" : "border-b border-line bg-paper")}>
      <div className={cn("container-page grid items-end gap-10", image ? "md:grid-cols-12" : "")}>
        <div className={cn("flex flex-col gap-5 py-12 sm:py-16", image && "md:col-span-7 lg:py-24")}>
          {breadcrumbs.length ? (
            <nav aria-label={breadcrumbLabel}>
              <ol className={cn("flex flex-wrap items-center gap-2 text-xs", dark ? "text-mist" : "text-mute")}>
                <li>
                  <Link href="/" className="inline-block py-2 hover:underline">
                    {homeLabel}
                  </Link>
                </li>
                {breadcrumbs.map((crumb) => (
                  <li key={crumb.label} className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    {crumb.href ? (
                      <Link href={crumb.href} className="inline-block py-2 hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {eyebrow ? (
            <p className={cn("eyebrow flex items-center gap-3", dark ? "text-gold" : "text-gold-deep")}>
              <span className="rule-gold" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="headline text-display">{title}</h1>
          {description ? (
            <p className={cn("max-w-lg text-[0.9375rem] leading-relaxed", dark ? "text-mist" : "text-subtle")}>{description}</p>
          ) : null}
          {children}
        </div>

        {image ? (
          <div className="relative hidden aspect-[4/5] self-stretch md:col-span-5 md:block md:aspect-auto md:min-h-[24rem]">
            <Image src={image.src} alt={image.alt} fill preload sizes="40vw" className="object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
