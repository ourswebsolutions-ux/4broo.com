import { getImageProps } from "next/image";
import { Button } from "@/components/ui/Button";

/**
 * Full-bleed cinematic hero with art direction: separate desktop (landscape)
 * and mobile (portrait) crops served through <picture>, an optional muted
 * background video, and overlay content. Preloaded as the LCP element.
 *
 * @param {{ content: ReturnType<typeof import("@/content/home").getHomeContent>["hero"] }} props
 */
export function Hero({ content }) {
  const { media } = content;
  const common = { alt: media.alt, sizes: "100vw", fetchPriority: "high", loading: "eager" };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, ...media.desktop });
  const {
    props: { srcSet: mobileSrcSet, ...imageProps },
  } = getImageProps({ ...common, ...media.mobile });

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100svh-6.5rem)] items-end overflow-hidden bg-ink text-paper lg:min-h-[calc(100svh-7.5rem)]">
      {/* The picture box carries the intro zoom; the image keeps its own scroll parallax. */}
      <picture className="hero-media absolute inset-0 -z-20 block overflow-hidden">
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
        <source srcSet={mobileSrcSet} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is supplied via getImageProps */}
        <img {...imageProps} className="hero-parallax absolute inset-0 size-full origin-top object-cover object-[50%_40%]" />
      </picture>

      {media.video ? (
        <video
          className="absolute inset-0 -z-10 size-full object-cover motion-reduce:hidden"
          src={media.video.src}
          poster={media.video.poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      ) : null}

      {/* Flat tonal veil for text legibility (no gradient wash). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink/25" />

      <div className="hero-content container-page flex w-full flex-col gap-8 pb-24 pt-32 sm:pb-20 lg:pb-24">
        <p className="eyebrow flex animate-reveal items-center gap-4 text-gold">
          <span className="rule-gold" aria-hidden="true" />
          {content.eyebrow}
        </p>
        <h1
          id="hero-title"
          className="headline max-w-5xl animate-reveal text-display-lg [animation-delay:120ms] [text-wrap:balance]"
        >
          {content.title}
        </h1>
        <div className="flex animate-reveal flex-col gap-8 [animation-delay:240ms] md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-[0.9375rem] leading-relaxed text-paper/80">{content.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={content.cta.href} variant="gold" size="lg" arrow>
              {content.cta.label}
            </Button>
            {content.secondaryCta ? (
              <Button href={content.secondaryCta.href} variant="outline-light" size="lg">
                {content.secondaryCta.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
