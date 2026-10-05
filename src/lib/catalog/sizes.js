// Garment size ordering shared by the product page and catalogue size filter.
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];

/** Letter sizes in wearing order, then numeric sizes (28, 30, 4Y…) ascending, then the rest. */
export function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    const na = Number.parseFloat(a);
    const nb = Number.parseFloat(b);
    return Number.isNaN(na) || Number.isNaN(nb) ? a.localeCompare(b) : na - nb;
  });
}
