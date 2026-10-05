// Public, non-secret brand & storefront configuration.
// Safe to import from both server and client components — never put secrets here.

export const siteConfig = {
  name: "4 BRO",
  tagline: "Create Your Legacy",
  domain: "4broo.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://4broo.com",
  description:
    "4 BRO — premium fashion and lifestyle. Considered design, elevated essentials. Create your legacy.",
  locale: "en",
  // Canonical store currency (all prices are stored in PKR) — see src/config/currency.js.
  currency: "PKR",
};

export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  account: "/account",
  adminLogin: "/admin/login",
  admin: "/admin",
};
