import Image from "next/image";
import { Button } from "@/components/ui/Button";

/** Dark editorial brand statement around "Create Your Legacy". */
export function BrandStory({ content }) {
  return (
    <section aria-labelledby="brand-story-title" className="bg-ink text-paper">
      <div className="container-page section-y grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="reveal relative aspect-[5/4] overflow-hidden bg-ink-soft lg:col-span-6 lg:aspect-[4/5]">
          <Image
            src={content.image.src}
            alt={content.image.alt}
            fill
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover object-[50%_30%] grayscale"
          />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-6">
          <p className="eyebrow reveal flex items-center gap-3 text-gold">
            <span className="rule-gold" aria-hidden="true" />
            {content.eyebrow}
          </p>
          <h2 id="brand-story-title" className="headline reveal text-display">
            {content.title.split(" ").map((word, index, words) => (
              <span key={index} className={index === words.length - 1 ? "block text-gold" : "block"}>
                {word}
              </span>
            ))}
          </h2>
          <div className="reveal flex max-w-lg flex-col gap-5 text-[0.9375rem] leading-relaxed text-mist">
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <Button href={content.cta.href} variant="outline-light" arrow className="reveal self-start">
            {content.cta.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
