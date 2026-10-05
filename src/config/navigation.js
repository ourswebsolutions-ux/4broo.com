// Storefront navigation — single source for header, mobile menu and footer.
// Department/collection slugs map to /collections/[slug] (see src/content/collections.js).
// `labelKey` is the translation key (src/i18n/dictionaries); `label` is the English fallback.

export const departments = [
  { label: "Men", labelKey: "nav.men", href: "/collections/men" },
  { label: "Women", labelKey: "nav.women", href: "/collections/women" },
  { label: "Kids", labelKey: "nav.kids", href: "/collections/kids" },
  {
    label: "Accessories", labelKey: "nav.accessories",
    href: "/collections/accessories",
    children: [
      { label: "Watches", labelKey: "nav.watches", href: "/collections/watches" },
      { label: "Perfumes", labelKey: "nav.perfumes", href: "/collections/perfumes" },
      { label: "Hand Bags", labelKey: "nav.handbags", href: "/collections/handbags" },
      { label: "Bags", labelKey: "nav.bags", href: "/collections/bags" },
    ],
  },
];

export const highlights = [
  { label: "New Arrivals", labelKey: "nav.newArrivals", href: "/collections/new-arrivals" },
  { label: "Sale", labelKey: "nav.sale", href: "/collections/sale", accent: true },
];

export const accountLinks = {
  account: "/account",
  wishlist: "/wishlist",
  cart: "/cart",
  search: "/search",
};

export const footerNavigation = [
  {
    titleKey: "footer.columns.shop",
    links: [
      { labelKey: "footer.links.men", href: "/collections/men" },
      { labelKey: "footer.links.women", href: "/collections/women" },
      { labelKey: "footer.links.kids", href: "/collections/kids" },
      { labelKey: "footer.links.accessories", href: "/collections/accessories" },
      { labelKey: "footer.links.newArrivals", href: "/collections/new-arrivals" },
      { labelKey: "footer.links.sale", href: "/collections/sale" },
    ],
  },
  {
    titleKey: "footer.columns.customer",
    links: [
      { labelKey: "footer.links.myAccount", href: "/account" },
      { labelKey: "footer.links.orders", href: "/account/orders" },
      { labelKey: "footer.links.wishlist", href: "/wishlist" },
      { labelKey: "footer.links.cart", href: "/cart" },
      { labelKey: "footer.links.trackOrder", href: "/track-order" },
    ],
  },
  {
    titleKey: "footer.columns.help",
    links: [
      { labelKey: "footer.links.contact", href: "/contact" },
      { labelKey: "footer.links.shipping", href: "/shipping" },
      { labelKey: "footer.links.returns", href: "/returns" },
      { labelKey: "footer.links.exchange", href: "/exchange" },
      { labelKey: "footer.links.sizeGuide", href: "/size-guide" },
      { labelKey: "footer.links.faqs", href: "/faqs" },
    ],
  },
  {
    titleKey: "footer.columns.company",
    links: [
      { labelKey: "footer.links.about", href: "/about" },
      { labelKey: "footer.links.contact", href: "/contact" },
      { labelKey: "footer.links.privacy", href: "/privacy-policy" },
      { labelKey: "footer.links.terms", href: "/terms" },
    ],
  },
];
