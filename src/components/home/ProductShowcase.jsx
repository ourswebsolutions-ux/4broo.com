import { ProductGrid } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Heading + product grid for the homepage rails (New Arrivals, Featured, Best
 * Sellers). Copy comes from the page (localised); products only from the database.
 */
export function ProductShowcase({ id, content, empty, products, tone = "paper" }) {
  return (
    <section aria-labelledby={id} className={tone === "bone" ? "bg-bone" : "bg-paper"}>
      <div className="container-page section-y flex flex-col gap-10 sm:gap-14">
        <SectionHeading id={id} eyebrow={content.eyebrow} title={content.title} description={content.description} action={content.action} />
        {products.length ? <ProductGrid products={products} /> : <EmptyState title={empty.title} description={empty.description} />}
      </div>
    </section>
  );
}
