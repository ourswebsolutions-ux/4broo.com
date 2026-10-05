import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Lookbook / social gallery: an even 4:5 grid (2 columns mobile, 3 desktop) so
 * any mix of portrait and landscape imagery stays balanced. `focus` sets the
 * crop focal point per image. Items may come from campaigns, product lifestyle
 * shots or — later — an Instagram feed. Item shape: { src, alt, focus?, href? }.
 */
export function Lookbook({ content, socialLink }) {
  return (
    <section aria-labelledby="lookbook-title" className="bg-paper">
      <div className="container-page section-y flex flex-col gap-10 sm:gap-14">
        <SectionHeading
          id="lookbook-title"
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
          action={socialLink ? { label: content.followLabel.replace("{network}", socialLink.name), href: socialLink.href } : undefined}
        />

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {content.items.map((item) => {
            const image = (
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 768px) 31vw, 48vw"
                style={{ objectPosition: item.focus ?? "50% 50%" }}
                className="object-cover transition-[scale] duration-[1400ms] ease-(--ease-luxe) group-hover:scale-[1.04]"
              />
            );
            return (
              <li key={item.src} className="reveal group relative aspect-[4/5] overflow-hidden bg-sand">
                {item.href ? (
                  <a href={item.href} className="absolute inset-0">
                    {image}
                  </a>
                ) : (
                  image
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
