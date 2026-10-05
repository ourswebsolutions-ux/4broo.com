import Image from "next/image";
import Link from "@/i18n/Link";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/utils/cn";

// Asymmetric editorial grid: wide/narrow, then narrow/wide on desktop.
const LAYOUT = [
  "md:col-span-7 aspect-[4/3]",
  "md:col-span-5 aspect-[4/5] md:aspect-auto",
  "md:col-span-5 aspect-[4/5] md:aspect-auto",
  "md:col-span-7 aspect-[4/3]",
];

/** Lifestyle accessories feature: watches, perfumes, hand bags, bags. */
export function AccessoriesSection({ content }) {
  return (
    <section aria-labelledby="accessories-title" className="bg-ink text-paper">
      <div className="container-page section-y flex flex-col gap-10 sm:gap-14">
        <SectionHeading
          id="accessories-title"
          tone="dark"
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          action={content.cta}
        />

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-12">
          {content.items.map((item, index) => (
            <li key={item.href} className={cn("reveal relative overflow-hidden bg-ink-soft max-md:aspect-[3/4]", LAYOUT[index])}>
              <Link href={item.href} className="group absolute inset-0 block">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="(min-width: 768px) 58vw, 50vw"
                  className="object-cover transition-[scale] duration-[1400ms] ease-(--ease-luxe) group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-paper/10 bg-ink/60 px-4 py-4 backdrop-blur-[2px] sm:px-6 sm:py-5">
                  <span className="headline text-xl leading-none sm:text-[1.75rem]">{item.label}</span>
                  <span className="flex items-center gap-2 text-gold">
                    <span className="eyebrow hidden sm:inline">{content.exploreLabel}</span>
                    <Icon name="arrowRight" className="size-4 transition-transform duration-500 ease-(--ease-luxe) group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
