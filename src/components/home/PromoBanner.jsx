import Image from "next/image";
import { Button } from "@/components/ui/Button";

/**
 * Minimal promotional banner (drops, campaigns, seasonal edits). Reusable: pass any
 * `content` with eyebrow/title/cta/image. Deliberately quiet — no discount-store styling.
 */
export function PromoBanner({ content }) {
  return (
    <section aria-labelledby="promo-title" className="bg-white">
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[38rem]">
          <Image src={content.image.src} alt={content.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col items-start justify-center gap-7 px-[clamp(1rem,4vw,3.5rem)] py-16 md:px-16 lg:px-24">
          <p className="eyebrow reveal flex items-center gap-3 text-gold-deep">
            <span className="rule-gold" aria-hidden="true" />
            {content.eyebrow}
          </p>
          <h2 id="promo-title" className="headline reveal text-display-sm max-w-md">
            {content.title}
          </h2>
          <Button href={content.cta.href} variant="primary" size="lg" arrow className="reveal">
            {content.cta.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
