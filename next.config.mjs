const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // Native/server-only packages stay external to the server bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-mariadb", "mariadb", "nodemailer", "cloudinary"],

  experimental: {
    // Request bodies through the proxy are buffered up to this size; admin image
    // uploads are capped at 8 MB (src/config/server.js) so they always fit.
    proxyClientMaxBodySize: "12mb",
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Never cache authenticated or admin responses in shared caches.
      { source: "/:area(checkout|ur/checkout|hi/checkout)", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      {
        source: "/:area(account|admin|api|checkout|ur/account|hi/account|ur/checkout|hi/checkout)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
