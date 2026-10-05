import Image from "next/image";
import Link from "@/i18n/Link";
import { Icon } from "@/components/ui/Icon";

/**
 * The four shopping departments as large editorial cards, placed directly
 * under the hero. 2×2 on mobile, 4 across from tablet up.
 */
export function CategorySwitcher({ items, heading, shopLabel }) {
  return (
    <section aria-labelledby="departments-title" className="bg-paper">
      <div className="container-page section-y-sm">
        <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
          <h2 id="departments-title" className="eyebrow flex items-center gap-3 text-gold-deep">
            <span className="rule-gold" aria-hidden="true" />
            {heading}
          </h2>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.href} className="reveal">
              <Link href={item.href} className="group relative block aspect-[3/4] overflow-hidden bg-ink">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="(min-width: 768px) 24vw, 48vw"
                  preload={index < 2}
                  className="object-cover opacity-90 transition-[scale,opacity] duration-1000 ease-(--ease-luxe) group-hover:scale-105 group-hover:opacity-100"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-ink/55 px-4 py-4 text-paper backdrop-blur-[2px] sm:px-5 sm:py-5">
                  <span className="headline text-[1.375rem] leading-none sm:text-[1.75rem]">{item.label}</span>
                  <span className="flex items-center gap-2 text-gold">
                    <span className="eyebrow hidden xl:inline">{shopLabel}</span>
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
