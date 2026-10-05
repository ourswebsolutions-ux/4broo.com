import { siteConfig } from "@/config/site";

// Private / per-customer areas are excluded in every language (/, /ur/…, /hi/…).
const PRIVATE = ["/account", "/cart", "/checkout", "/wishlist", "/login", "/register", "/forgot-password", "/reset-password", "/search"];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", ...PRIVATE, ...PRIVATE.flatMap((path) => [`/ur${path}`, `/hi${path}`])],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
