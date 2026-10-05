// Re-mounted on every storefront navigation: a short, subtle fade/rise for new pages.
// (Respects prefers-reduced-motion via the global rule in globals.css.)
export default function StorefrontTemplate({ children }) {
  return <div className="flex flex-1 animate-page flex-col">{children}</div>;
}
