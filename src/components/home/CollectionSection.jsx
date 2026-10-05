import Image from "next/image";
import Link from "@/i18n/Link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

/**
 * Editorial department feature: a large campaign image, a detail image and copy.
 * `reverse` mirrors the layout so consecutive sections alternate.
 * @param {{ content: { eyebrow: string, title: string, description: string, cta: {label:string, href:string}, links?: Array<{label:string, href:string}>, images: { main: {src:string, alt:string}, detail: {src:string, alt:string} } }, reverse?: boolean, tone?: "paper"|"bone", id: string }} props
 */
export function CollectionSection({ content, reverse = false, tone = "paper", id }) {
  return (
    <section aria-labelledby={id} className={tone === "bone" ? "bg-bone" : "bg-paper"}>
      <div className="container-page section-y grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
        <div className={cn("reveal relative md:col-span-7", reverse && "md:order-2")}>
          <Link href={content.cta.href} className="group block overflow-hidden" tabIndex={-1} aria-hidden="true">
            <div className="relative aspect-[4/5] overflow-hidden bg-sand lg:aspect-[5/6]">
              <Image
                src={content.images.main.src}
                alt={content.images.main.alt}
                fill
                sizes="(min-width: 768px) 56vw, 100vw"
                className="depth-far object-cover transition-[scale] duration-[1400ms] ease-(--ease-luxe) group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        </div>

        <div className={cn("flex flex-col gap-10 md:col-span-5", reverse && "md:order-1")}>
          <div className="reveal flex flex-col gap-5">
            <p className="eyebrow flex items-center gap-3 text-gold-deep">
              <span className="rule-gold" aria-hidden="true" />
              {content.eyebrow}
            </p>
            <h2 id={id} className="headline text-display-sm">
              {content.title}
            </h2>
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-subtle">{content.description}</p>
            {content.links?.length ? (
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {content.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="eyebrow inline-flex min-h-11 items-center text-ink/70 hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button href={content.cta.href} variant="primary" arrow className="self-start">
              {content.cta.label}
            </Button>
          </div>

          {/* Layered depth: the detail image travels slightly faster than the main image. */}
          <div className={cn("depth-near relative hidden aspect-[3/4] w-3/5 overflow-hidden bg-sand shadow-[0_30px_60px_-35px_rgb(11_11_10/0.45)] md:block", reverse ? "self-start" : "self-end")}>
            <Image src={content.images.detail.src} alt={content.images.detail.alt} fill sizes="20vw" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
