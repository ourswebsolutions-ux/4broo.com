// Storefront collections (departments, accessory types and curated edits).
// `filter` is declarative so the data layer can translate it to a Prisma `where`
// (src/services/productService.js → buildProductWhere).
//   gender      → Product.gender
//   categories  → Category.slug of the product's category or its parent
//   flag        → boolean Product column (newArrival, onSale, bestSeller, featured)
//   popular     → flagged best seller OR has real (non-cancelled) sales
// Departments are scoped by category (department + its subcategories), so a product
// always appears where the admin filed it, whatever its gender attribute says.

export const collections = [
  {
    slug: "men",
    title: "Men",
    eyebrow: "Department",
    description: "Tailoring, outerwear and considered essentials for every day.",
    image: { src: "/images/storefront/collection-men-main.jpg", alt: "Man in an open black suit jacket against a pale studio wall" },
    filter: { categories: ["men"] },
  },
  {
    slug: "women",
    title: "Women",
    eyebrow: "Department",
    description: "Sharp tailoring, fluid trousers and pieces that move with you.",
    image: { src: "/images/storefront/collection-women-main.jpg", alt: "Woman in a grey wool coat photographed in black and white" },
    filter: { categories: ["women"] },
  },
  {
    slug: "kids",
    title: "Kids",
    eyebrow: "Department",
    description: "Smart, comfortable pieces for the next generation.",
    image: { src: "/images/storefront/collection-kids-main.jpg", alt: "Young boy in a patterned black shirt" },
    filter: { categories: ["kids"] },
  },
  {
    slug: "accessories",
    title: "Accessories",
    eyebrow: "Department",
    description: "Watches, perfumes, hand bags and bags to complete the look.",
    image: { src: "/images/storefront/accessories-watches.jpg", alt: "Skeleton watch resting in a dark presentation box" },
    filter: { categories: ["accessories"] },
  },
  {
    slug: "watches",
    title: "Watches",
    eyebrow: "Accessories",
    description: "Timepieces chosen for character and everyday wear.",
    image: { src: "/images/storefront/accessories-watches.jpg", alt: "Skeleton watch resting in a dark presentation box" },
    filter: { categories: ["watches"] },
  },
  {
    slug: "perfumes",
    title: "Perfumes",
    eyebrow: "Accessories",
    description: "Fragrances with warmth and presence.",
    image: { src: "/images/storefront/accessories-perfumes.jpg", alt: "Amber perfume bottle on draped gold satin" },
    filter: { categories: ["perfumes"] },
  },
  {
    slug: "handbags",
    title: "Hand Bags",
    eyebrow: "Accessories",
    description: "Structured and soft hand bags in fine leather.",
    image: { src: "/images/storefront/accessories-handbags.jpg", alt: "Grey top-handle bag passed between two hands" },
    filter: { categories: ["handbags"] },
  },
  {
    slug: "bags",
    title: "Bags",
    eyebrow: "Accessories",
    description: "Holdalls, satchels and carry-alls built for movement.",
    image: { src: "/images/storefront/accessories-bags.jpg", alt: "Brown leather satchel on a wooden stool" },
    filter: { categories: ["bags"] },
  },
  {
    slug: "new-arrivals",
    title: "New Arrivals",
    eyebrow: "Just in",
    description: "The latest pieces across every department.",
    image: { src: "/images/storefront/lookbook-1.jpg", alt: "Woman in a navy jacket crouching under cool city light" },
    filter: { flag: "newArrival" },
  },
  {
    slug: "featured",
    title: "Featured",
    eyebrow: "Curated",
    description: "Pieces our team is wearing and recommending right now.",
    image: { src: "/images/storefront/lookbook-3.jpg", alt: "Man in profile lit by a single blue light" },
    filter: { flag: "featured" },
  },
  {
    slug: "best-sellers",
    title: "Best Sellers",
    eyebrow: "Most wanted",
    description: "The pieces customers return to most.",
    image: { src: "/images/storefront/lookbook-2.jpg", alt: "Two people in dark tailoring by the sea, black and white" },
    filter: { popular: true },
  },
  {
    slug: "sale",
    title: "Sale",
    eyebrow: "Selected pieces",
    description: "A considered selection at reduced prices.",
    image: { src: "/images/storefront/lookbook-4.jpg", alt: "Two men in black leather and denim" },
    filter: { flag: "onSale" },
  },
];

export function getCollectionDefinition(slug) {
  return collections.find((collection) => collection.slug === slug) ?? null;
}
