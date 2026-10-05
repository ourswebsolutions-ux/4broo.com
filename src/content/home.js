// Homepage editorial content. Structure (links, imagery, crops) lives here; all
// wording comes from the dictionaries (`home.*`), so every language is complete.
// Imagery: licensed editorial photography (see docs/MEDIA_CREDITS.md).

const img = (name) => `/images/storefront/${name}`;

/** @param {(key: string) => any} t  server translator for the page's locale */
export function getHomeContent(t) {
  return {
    hero: {
      eyebrow: "4 BRO",
      title: t("brand.tagline"),
      subtitle: t("home.hero.subtitle"),
      cta: { label: t("home.hero.cta"), href: "/collections/new-arrivals" },
      secondaryCta: { label: t("home.hero.secondary"), href: "/collections/accessories" },
      media: {
        desktop: { src: img("hero-desktop.jpg"), width: 2400, height: 1600 },
        mobile: { src: img("hero-mobile.jpg"), width: 1000, height: 1500 },
        alt: t("home.hero.alt"),
        video: null,
      },
    },

    departments: {
      heading: t("home.departments.heading"),
      shopLabel: t("home.departments.shop"),
      items: ["men", "women", "kids", "accessories"].map((key) => ({
        label: t(`nav.${key}`),
        href: `/collections/${key}`,
        image: { src: img(`category-${key}.jpg`), alt: t(`home.departments.alts.${key}`) },
      })),
    },

    featuredCollections: {
      men: {
        eyebrow: t("nav.men"),
        title: t("home.men.title"),
        description: t("home.men.description"),
        cta: { label: t("home.men.cta"), href: "/collections/men" },
        links: [
          { label: t("home.links.shirts"), href: "/collections/men-shirts" },
          { label: t("home.links.jackets"), href: "/collections/men-jackets" },
          { label: t("home.links.newIn"), href: "/collections/new-arrivals" },
        ],
        images: {
          main: { src: img("collection-men-main.jpg"), alt: t("home.men.altMain"), width: 1067, height: 1600 },
          detail: { src: img("collection-men-detail.jpg"), alt: t("home.men.altDetail"), width: 667, height: 1000 },
        },
      },
      women: {
        eyebrow: t("nav.women"),
        title: t("home.women.title"),
        description: t("home.women.description"),
        cta: { label: t("home.women.cta"), href: "/collections/women" },
        links: [
          { label: t("home.links.dresses"), href: "/collections/women-dresses" },
          { label: t("home.links.tops"), href: "/collections/women-tops" },
          { label: t("home.links.newIn"), href: "/collections/new-arrivals" },
        ],
        images: {
          main: { src: img("collection-women-main.jpg"), alt: t("home.women.altMain"), width: 1280, height: 1600 },
          detail: { src: img("collection-women-detail.jpg"), alt: t("home.women.altDetail"), width: 733, height: 1000 },
        },
      },
      kids: {
        eyebrow: t("nav.kids"),
        title: t("home.kids.title"),
        description: t("home.kids.description"),
        cta: { label: t("home.kids.cta"), href: "/collections/kids" },
        links: [
          { label: t("home.links.tshirts"), href: "/collections/kids-t-shirts" },
          { label: t("home.links.hoodies"), href: "/collections/kids-hoodies" },
        ],
        images: {
          main: { src: img("collection-kids-main.jpg"), alt: t("home.kids.altMain"), width: 1067, height: 1600 },
          detail: { src: img("collection-kids-detail.jpg"), alt: t("home.kids.altDetail"), width: 667, height: 1000 },
        },
      },
    },

    accessoriesFeature: {
      eyebrow: t("nav.accessories"),
      title: t("home.accessories.title"),
      description: t("home.accessories.description"),
      cta: { label: t("home.accessories.cta"), href: "/collections/accessories" },
      exploreLabel: t("home.accessories.explore"),
      items: ["watches", "perfumes", "handbags", "bags"].map((key) => ({
        label: t(`nav.${key}`),
        href: `/collections/${key}`,
        image: { src: img(`accessories-${key}.jpg`), alt: t(`home.accessories.alts.${key}`) },
      })),
    },

    brandStory: {
      eyebrow: t("home.story.eyebrow"),
      title: t("brand.tagline"),
      body: [t("home.story.body1"), t("home.story.body2")],
      cta: { label: t("footer.links.about"), href: "/about" },
      image: { src: img("brand-story.jpg"), alt: t("home.story.alt"), width: 1800, height: 1440 },
    },

    promo: {
      eyebrow: t("home.promo.eyebrow"),
      title: t("home.promo.title"),
      cta: { label: t("home.promo.cta"), href: "/collections/new-arrivals" },
      image: { src: img("promo.jpg"), alt: t("home.promo.alt"), width: 2000, height: 1500 },
    },

    lookbook: {
      eyebrow: t("home.lookbook.eyebrow"),
      title: t("home.lookbook.title"),
      description: t("home.lookbook.description"),
      followLabel: t("home.lookbook.follow"),
      items: [
        { src: img("lookbook-1.jpg") },
        { src: img("lookbook-3.jpg"), focus: "68% 50%" },
        { src: img("lookbook-2.jpg") },
        { src: img("lookbook-4.jpg") },
        { src: img("lookbook-5.jpg"), focus: "48% 70%" },
        { src: img("lookbook-6.jpg"), focus: "50% 40%" },
      ].map((item, index) => ({ ...item, alt: t("home.lookbook.alts")[index] })),
    },

    showcase: {
      newArrivals: { eyebrow: t("home.showcase.newEyebrow"), title: t("home.showcase.newTitle"), description: t("home.showcase.newText"), action: { label: t("home.showcase.viewAll"), href: "/collections/new-arrivals" } },
      featured: { eyebrow: t("home.showcase.featuredEyebrow"), title: t("home.showcase.featuredTitle"), description: t("home.showcase.featuredText"), action: { label: t("home.showcase.viewAll"), href: "/collections/featured" } },
      bestSellers: { eyebrow: t("home.showcase.bestEyebrow"), title: t("home.showcase.bestTitle"), description: t("home.showcase.bestText"), action: { label: t("home.showcase.bestAction"), href: "/collections/best-sellers" } },
      empty: { title: t("home.showcase.emptyTitle"), description: t("home.showcase.emptyText") },
    },
  };
}
