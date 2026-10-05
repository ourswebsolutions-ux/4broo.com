import { Skeleton } from "@/components/ui/LoadingState";
import { cn } from "@/utils/cn";
import { ProductCard } from "./ProductCard";

// 2 columns on mobile (fashion standard), 3 on tablet, 4 on desktop.
const GRID = "grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 md:gap-y-14 xl:grid-cols-4";

/** @param {{ products: import("@/data/mappers").ProductCardData[], preloadFirst?: number, className?: string }} props */
export function ProductGrid({ products, preloadFirst = 0, className }) {
  return (
    <ul className={cn(GRID, className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} preload={index < preloadFirst} />
        </li>
      ))}
    </ul>
  );
}

/** Same geometry as ProductGrid so loading → loaded causes no layout shift. */
export function ProductGridSkeleton({ count = 8, className, label }) {
  return (
    <div role="status" aria-label={label} className={cn(GRID, className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="mt-4 h-2.5 w-1/4" />
          <Skeleton className="mt-2.5 h-3.5 w-3/4" />
          <Skeleton className="mt-2.5 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
