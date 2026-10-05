# 4 BRO — 4broo.com

Premium fashion & lifestyle e-commerce platform. **Create Your Legacy.**

Next.js 16 (App Router, JavaScript/JSX) · React 19 · Tailwind CSS 4 · Prisma 7 + MySQL/MariaDB · Cloudinary · SMTP (Nodemailer) · WAAPI WhatsApp.

## Getting started

```bash
npm install                      # also runs `prisma generate`
cp .env.example .env.local       # fill in real values (never commit this file)
npm run db:deploy                # apply migrations to DATABASE_URL
npm run db:seed                  # departments + subcategories (structural data only)
npm run admin:create             # create the first administrator (interactive)
npm run dev                      # http://localhost:3000
```

Requires Node.js ≥ 22.18 and a MySQL 8 / MariaDB 10.6+ database.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve production |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create + apply a new migration in development (`prisma migrate dev`) |
| `npm run db:deploy` | Apply pending migrations (production / CI) |
| `npm run db:status` · `db:validate` · `db:generate` · `db:studio` | Prisma utilities |
| `npm run db:seed` | Category structure (+ optional admin bootstrap); idempotent |
| `npm run prisma:db:products-seed [-- --refresh]` | Add the 20 launch products; idempotent, never deletes |
| `npm run admin:create` | Create an admin, or promote an existing account |
| `npm run verify [-- service]` | Check integrations: `database`, `email [--send-to x@y]`, `whatsapp [--send]`, `cloudinary` |

Signed-in admins can run the same checks from **/admin** → *Integration checks*.

## Project structure

```
prisma/                    schema.prisma + migrations
scripts/                   CLI tools (admin bootstrap, integration checks)
src/
  proxy.js                 optimistic auth redirect (real checks happen server-side)
  app/
    (storefront)/          public site + /account (customer area)
    (auth)/                /login, /register
    admin/                 /admin/login + (panel)/ guarded admin area
    api/                   route handlers (health, admin diagnostics)
  actions/                 Server Actions (auth)
  components/              ui/ primitives, layout/, auth/, admin/
  config/                  site.js (public) · server.js (non-secret server settings)
  lib/                     server-only infrastructure
    auth/                  password hashing, sessions, role guards
    services/              email, whatsapp, cloudinary, diagnostics
    validation/            Zod helpers + schemas
    security/              rate limiting
    db.js env.js errors.js logger.js api.js
  utils/                   isomorphic helpers (formatting, Cloudinary URLs)
  generated/prisma/        generated client (git-ignored)
```

## Storefront (Phase 2)

- **Design tokens** live in `src/app/globals.css` (`@theme`): ink/charcoal/off-white neutrals and the logo gold as the single accent; Cormorant (display) + Manrope (UI). Brand assets are generated from `public/logo.png` into `public/brand/`.
- **Content vs. data**: editorial copy/imagery is in `src/content/` (home, collections, info pages); products come only from `src/data/catalog.js` (server-only), which returns the `ProductCardData` shape defined in `src/data/mappers.js`.
- **Public contact** (`PUBLIC_WHATSAPP_NUMBER`, `PUBLIC_CONTACT_EMAIL`, `PUBLIC_*_URL`) is read server-side and baked into static pages — rebuild after changing these values.
- Product, collection and information pages are indexable and listed in the sitemap (all languages); account, bag, checkout and search pages are not.

## Database (Phase 3)

- **Schema**: `prisma/schema.prisma` — users/roles, sessions, addresses, two-level categories (+ translations), products (+ translations, images, variants), cart, wishlist, save-for-later, orders (snapshots), payments. Baseline migration: `prisma/migrations/20261002130000_ecommerce_schema` (includes DB `CHECK` constraints).
- **Money**: `DECIMAL(12,2)`, canonical **PKR**. Exact decimal maths in `src/lib/currency/money.js`; the price rule in `src/lib/currency/pricing.js`; USD is display-only via `src/lib/currency/rates.js` (`EXCHANGE_RATE_PKR_USD`, no default).
- **Services** (server-only): `src/services/{category,product,cart,wishlist,order}Service.js`. Multi-step writes use `withTransaction` from `src/lib/db.js`; stock decrements are conditional (no overselling).
- **Languages**: `src/i18n/` — `en`, `ur` (RTL), `hi`; UI strings in JSON dictionaries, catalogue translations in `*Translation` tables.
- **Seed**: `npm run db:seed` creates departments + subcategories only (idempotent). Optional admin via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

## Catalogue management (Phase 4)

- **Admin**: `/admin/products` (list, search, status tabs, category filter, publish/unpublish/archive/delete), `/admin/products/new` & `/admin/products/[id]` (sectioned form: basic info, category/subcategory, PKR pricing + discount helper, variants with combination generator, multi-image manager, flags, SEO, publishing), `/admin/categories` (tree, create/edit, publish/hide, reorder, image, safe delete).
- **Mutations**: Server Actions in `src/actions/admin/*`, every one re-authorised server-side via `runAdminAction` (`src/lib/actions.js`); storefront pages are revalidated after each change.
- **Images**: `POST /api/admin/products/[id]/images` (one file per request, admin only). Bytes are validated by magic number (JPG/PNG/WebP/AVIF, ≤ 8 MB), uploaded to Cloudinary `4bro/products/<productId>/`, then recorded in MySQL; a failed DB write deletes the uploaded asset. Product rows are locked during image inserts so parallel uploads keep exactly one primary image and a gapless order.
- **Storefront**: database-driven cards (primary + hover image only when a second image exists), product page gallery (arrows, dots, desktop thumbnails, swipe, keyboard, lightbox), variant selector (size/colour → SKU, stock, price override), PKR with optional ≈ USD.
- **Languages**: storefront URLs are `/` (English), `/ur/…` (RTL) and `/hi/…`; the proxy maps unprefixed URLs to the English tree. UI strings in `src/i18n/dictionaries`, catalogue text from `ProductTranslation` / `CategoryTranslation`.
- **Pagination**: replaced in Phase 5 by `?page=<n>` (see below).

## Search, filters & interaction (Phase 5)

- **URL state**: `src/lib/catalog/query.js` parses/serialises everything (`q, sub, gender, size, color, material, stock, sale, new, best, featured, min, max, cur, sort, page`). Invalid values are dropped, reversed price ranges swapped; URLs are shareable and survive refresh/back/forward. Filtered URLs are `noindex` with the unfiltered page as canonical.
- **Queries**: `buildProductWhere` / `paginatePublishedProducts` / `getFilterFacets` in `productService.js`. A collection's own scope is passed as `base` and is always ANDed, so user filters can never widen it. Size + colour match on one in-stock variant. Facets exclude their own selection (multi-select never dead-ends).
- **Price**: `Product.effectivePrice` (migration `20261002164836_product_effective_price`) stores the price actually charged (sale price when on sale), kept in sync by every product write. USD filter bounds are converted exactly to PKR (`convertToBase`) before querying.
- **Sorting**: featured, newest, best selling (real non-cancelled `OrderItem` quantities, offered only when sales exist), price ↑/↓, name A–Z.
- **UI**: `src/components/catalog/{CatalogResults,FilterPanel}.jsx` (desktop sticky sidebar, mobile drawer with draft + Apply), `src/components/search/SearchField.jsx` (debounced suggestions: categories + products, keyboard navigation, recent searches), PKR/USD switcher (`src/components/currency/*`).
- **Motion**: CSS only — page fade (`(storefront)/template.js`), scroll-driven hero/banner parallax and layered depth (`globals.css`, `@supports (animation-timeline)`, ≥ 768 px), ≤ 2.5° card tilt on fine pointers (`useTilt.js`). All disabled under `prefers-reduced-motion`.

## Shopping & accounts (Phase 6)

- **Shop state**: `src/data/shop.js` builds the cart / saved / wishlist view on the server (PKR `BigInt` maths, USD display only). The client `ShopProvider` (`src/components/shop/`) loads it from `GET /api/shop` (per-session, `no-store`) so storefront pages stay statically cached, and every mutation is a Server Action in `src/actions/shop.js` that returns the fresh state. Prices and totals are never accepted from the browser.
- **Rules**: one cart row per variant; product must be published, the variant must belong to it and have stock; quantity 1–99 and ≤ stock; wishlist and saved items are unique per user. Products with a single variant (no size/colour) are added directly.
- **Guests** can browse everything. "Add to bag" or the heart opens a sign-in prompt; the action is remembered (sessionStorage) and completed after sign-in/registration.
- **Accounts**: `/account` (overview), `/account/orders` (real orders only), `/account/saved`, `/account/addresses` (CRUD, one default), `/account/profile` (details + password change, which signs out other devices); `/cart`, `/wishlist`. Guarded by `requireCustomer`; mutations by `runCustomerAction` (session identity, CUSTOMER role, localised messages).
- **Password reset**: `/forgot-password` → email (SMTP) with a single-use, 1-hour link built from `NEXT_PUBLIC_SITE_URL` → `/reset-password`. Same response whether or not the email exists; all sessions are revoked after a reset. In development without SMTP the link is written to the server log.
- **Language & currency**: separate header dropdowns (`LanguageMenu`, `CurrencyMenu` on `ui/SelectMenu`): keyboard accessible, close on outside click / Esc, kept inside the viewport. The language choice is saved in the `4bro_locale` cookie and the proxy sends returning visitors from unprefixed URLs to their language; currency is saved per browser.

## Checkout & orders (Phase 7)

- **Checkout**: `/checkout` (signed-in customers; the bag is account-based, so there is no guest checkout). Contact → delivery address (saved or new, optionally saved to the account) → delivery → payment → review. Distraction-free layout in `src/app/[locale]/(checkout)`. Totals, delivery fee and prices are computed on the server (`src/services/orderService.js`); the form only sends details, choices and an idempotency key.
- **Order placement** (`placeOrder`): one transaction creates the order (number `4BRO-YYYYMMDD-XXXXXX`, random suffix, unique), item snapshots, payment row and first status event, and reserves stock with conditional decrements (no overselling; write conflicts are retried and the loser gets "stock changed"). The same idempotency key always returns the same order. COD empties the bag immediately; online payments only when paid.
- **Delivery fee**: `DELIVERY_FEE_PKR` (+ optional `FREE_DELIVERY_THRESHOLD_PKR`) for Pakistan. When not configured (or outside Pakistan) the order is placed with the fee "to be confirmed" — no amount is invented. See `src/lib/shipping.js`.
- **Payments**: COD → payment `PENDING`, admin records cash collection. PayNow: foundation only (`src/lib/payments/paynow.js`) — the provider contract (request, signature, status mapping) is not implemented because no API specification or credentials exist; PayNow is shown as unavailable and cannot be selected. Return/callback routes (`/api/payments/paynow/*`) never trust the browser: status comes from the provider and is applied idempotently by `src/services/paymentService.js` (paid only if amount and currency match; failed/cancelled → order cancelled and stock returned once).
- **Customer**: confirmation page, `/account/orders` + `/account/orders/<number>` (own orders only, looked up by number + session user), public `/track-order` (order number + checkout email, rate-limited, minimal data).
- **Admin**: `/admin/orders` (search, status tabs, pagination) and order detail (customer, items, payment, address, history, internal note). Status follows `ORDER_TRANSITIONS` with stale-update protection; cancelling returns stock once. Orders can only be created by customers — the admin has no create-order feature.
- **Notifications** (email/WhatsApp) are a later phase: hook point `afterOrderPlaced` in `orderService.js`.

## Notifications (Phase 8)

- **Customer rule — WhatsApp first, email only as fallback** (`src/services/notificationService.js`): WhatsApp SENT → stop; WhatsApp FAILED (error, timeout, invalid number, not configured) → email with `fallbackFrom = WHATSAPP`; both FAILED → recorded as FAILED, the order is unaffected, admin can retry from the order page. Never both.
- **Events**: COD order placed (customer + admin), verified PayNow payment (customer + admin, only after the provider confirms PAID), admin status changes CONFIRMED…CANCELLED (customer; SHIPPED includes the status note, e.g. a courier tracking number). Messages use the order's checkout language (en/ur/hi; Urdu emails are RTL).
- **Admin alerts** use WhatsApp (admin number from `/admin/settings` or `WAAPI_ADMIN_NUMBER`) and email (`ADMIN_NOTIFICATION_EMAIL` / alias `ADMIN_EMAIL`, falls back to the sender) independently.
- **Idempotency**: every event has an `eventKey`; the unique `Notification(eventKey, channel)` row is claimed before sending, so repeated or concurrent triggers never duplicate. Rows are the audit trail (channel, recipient, status, attempts, provider reference, fallback, error).
- **Delivery** runs after the response via `next/server` `after()` — never inside the order transaction, never slowing checkout.
- **WAAPI client** (`src/lib/services/whatsapp.js`): request/response verified against the provider docs (`success: true`, `data.messageId`); number normalisation (03xx… → 92…); 15 s timeout; retries only for connection errors and 429/502/503/504 (a timeout is not retried — it may already have been delivered); keys never logged.
- **Email**: Nodemailer over SMTP (Gmail: smtp.gmail.com:465, SSL, app password); premium responsive HTML + plain text (`src/lib/notifications/templates.js`).
- **Env names**: the canonical names and the Phase 8 aliases both work — `SMTP_USERNAME`/`SMTP_USER`, `SMTP_SENDER_EMAIL`/`SMTP_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`/`ADMIN_EMAIL`, `WAAPI_TOKEN`/`WAAPI_API_KEY`; if both are set, the canonical name wins. `WAAPI_BASE_URL` may be the origin or the full `/api/v1/messages/text` endpoint.

## Welcome experience (Phase 9)

- **What**: a ~2.6 s cinematic intro on the first storefront page of a browser session — the real 4 BRO mark resolves from blur, a light pass crosses it (masked to the artwork), "4 BRO" rises letter by letter, "CREATE YOUR LEGACY" settles, then a curtain lifts and the homepage header, hero image and headline enter in sequence.
- **How**: pure CSS keyframes (`globals.css` → "Welcome sequence"; no animation library). `src/components/welcome/WelcomeSplash.jsx` holds the markup, an inline gate script that runs before first paint (sets `html[data-welcome]`: play → reveal → done, or exit when skipped) and the small client controller (timers aligned to navigation start, skip on any key/click, scroll held without layout changes).
- **When**: once per browser session (sessionStorage). Never on refresh, client navigation, `/account`, `/cart`, `/track-order`, auth, checkout or admin. Without JavaScript nothing is shown.
- **Accessibility**: decorative and `aria-hidden`; any key skips; `prefers-reduced-motion` gets a static logo + text and a 350 ms fade (~1 s total).
- **Performance**: one 30 KB WebP (`public/brand/logo-mark-splash.webp`, lazy so it is only fetched when the intro plays); the hero image keeps loading underneath; no layout shift (CLS 0 measured).

## Admin settings (`/admin/settings`)

Administrators manage WhatsApp (WAAPI), SMTP, business contact details and notification preferences without editing `.env` or restarting.

- **Priority per setting**: value saved in the admin (database) → environment variable → built-in default → "not configured". The page shows the source of every value (Admin / Env / Default / Not set). Existing `.env` configuration keeps working with no database overrides.
- **Return to the environment**: "Reset to environment values" in a section removes that section's saved (non-secret) values; "Remove" on a credential deletes the saved credential; clearing a field and saving removes that one override. Saving a value equal to the environment value stores nothing, so `.env` configuration is never silently replaced.
- **Credentials** (WAAPI API key, session ID, SMTP password) are encrypted with AES-256-GCM (random 96-bit IV per value, auth tag, setting key bound as AAD) using `SETTINGS_ENCRYPTION_KEY` (`openssl rand -base64 32`), which exists only in the server environment. They are never returned to the browser, never logged and never written to the audit log. An empty credential input keeps the stored value; "Replace" and "Remove" are explicit. If the key is missing, credentials can't be saved and nothing is changed.
  - **Back up the key** with your other secrets. If it is lost, saved credentials cannot be decrypted: the environment fallback is used and the page flags them as unreadable — re-enter them.
  - **Rotation**: move the current key to `SETTINGS_ENCRYPTION_KEY_PREVIOUS`, set a new `SETTINGS_ENCRYPTION_KEY`, re-save each credential (the page flags ones still on the previous key), then remove the previous key.
- **Tests**: WhatsApp "Test connection" calls WAAPI `GET /api/v1/session/status` (sends nothing); "Send test message" and SMTP "Send test email" send one clearly labelled message. Rate-limited to 5 per 10 minutes per admin per integration; no order or payment data is touched.
- **Preferences**: customer order confirmation / status updates / payment confirmation / email fallback; admin new-order WhatsApp / email and the admin recipient email. The delivery rule is unchanged — WhatsApp first; email only if WhatsApp fails (or WhatsApp is turned off); a channel that is turned off is recorded as `SKIPPED`.
- **Audit**: every save, credential replacement/removal, override reset and test is recorded in `SettingAuditLog` (admin, category, action, setting names, safe outcome, time) and the latest entries are shown on the page.
- **Security**: page, Server Actions and tests require the ADMIN role server-side; Server Actions reject cross-origin requests; all inputs are validated with Zod on the server.
- **Code**: `src/lib/settings` (registry + resolver + cache), `src/lib/security/encryption.js`, `src/services/settingsService.js`, `src/actions/admin/settings.js`, `src/components/admin/settings`.

## Launch catalogue (product seeder)

`npm run prisma:db:products-seed` adds the 20 curated launch products — 5 each in Men, Women, Kids and Accessories — from `prisma/seed-data/products.mjs` (script: `prisma/seed-products.mjs`).

- Each product is published with its subcategory, PKR price (sale price where marked), material, short and full description, Urdu and Hindi names, sizes/colours as variants with SKUs and opening stock, and 2–3 images (primary first, ordered, with alt text).
- Images are static files in `public/images/products/<slug>/` (1000×1250, deployed with the app; credits in `docs/MEDIA_CREDITS.md`). They are recorded with publicId `local/products/…` and are never sent to Cloudinary for deletion.
- **Safe to re-run:** products are matched by slug/SKU and never duplicated. Existing products are skipped, so admin edits, stock and status are kept. Missing seed images or translations are added back. A slug or SKU already used by a different product is reported and left alone. Categories are found by slug and created only if missing. Nothing is ever deleted, and orders, customers and settings are not touched. The script exits non-zero on any failure.
- `npm run prisma:db:products-seed -- --refresh` also refreshes the seeded copy, prices and flags of existing seed products. It never changes their stock, variants or status.
- No product is flagged "best seller". The Best Sellers rail and collection fill from real sales (non-cancelled orders), plus anything an admin flags.

## Production deployment (live server)

Run from the project directory on the server. Back up the database first (e.g. `mysqldump --single-transaction <db> > backup.sql`). None of these commands reset or delete data.

```bash
git pull                                   # or upload the new release
npm ci                                     # installs dependencies and runs prisma generate
npx prisma migrate status                  # see which migrations are pending
```

If `migrate status` reports that the database is **not managed by Prisma Migrate** (tables exist but there is no history — the situation found in development), baseline it once:

```bash
npx prisma migrate resolve --applied 20261002130000_ecommerce_schema
npx prisma migrate resolve --applied 20261002132111_product_seo_fields
```

Then apply the pending migrations (additive only — new columns/tables), seed and build:

```bash
npm run db:deploy                          # prisma migrate deploy — never resets
npm run db:seed                            # category structure (idempotent)
npm run prisma:db:products-seed            # 20 launch products (idempotent)
npm run build
pm2 ls                                     # find this app's process name
pm2 restart <name-from-pm2-ls> --update-env
```

Set `SETTINGS_ENCRYPTION_KEY` in the server environment before the restart (see Admin settings).

## Launch checklist (final phase)

1. **Database** — the configured MySQL database has the Phase 4 tables but no migration history. Baseline it once, then deploy and seed:
   ```
   npx prisma migrate resolve --applied 20261002130000_ecommerce_schema
   npx prisma migrate resolve --applied 20261002132111_product_seo_fields
   npm run db:deploy && npm run db:seed
   ```
   (On a brand-new empty database just run `npm run db:deploy && npm run db:seed`.)
2. **Settings key + WhatsApp** — set `SETTINGS_ENCRYPTION_KEY` (and back it up), then add the WAAPI API key, session ID and admin number in `/admin/settings` (or set `WAAPI_API_KEY`, `WAAPI_SESSION_ID`, `WAAPI_ADMIN_NUMBER`). Until then customer messages are sent by email (fallback) and admin WhatsApp alerts are skipped.
3. **PayNow** — implement the provider contract in `src/lib/payments/paynow.js` from PayNow's documentation and set `PAYNOW_API_BASE_URL`, `PAYNOW_API_KEY`, `PAYNOW_SECRET`. Until then checkout offers cash on delivery only.
4. **Delivery fee** — set `DELIVERY_FEE_PKR` (and optionally `FREE_DELIVERY_THRESHOLD_PKR`); otherwise fees are "to be confirmed".
5. **Site URL** — set `NEXT_PUBLIC_SITE_URL` to the production origin (canonical URLs, sitemap, email links).
6. `npm run verify` checks the database, SMTP (no send), Cloudinary (ping) and WhatsApp configuration; `npm run verify -- email --send-to you@example.com` / `-- whatsapp --send` send one real test message.
7. Policy pages (`/shipping`, `/returns`, `/exchange`, `/privacy-policy`, `/terms`) describe how the store works and avoid invented terms; have them reviewed against your business terms before launch.

## Security model

- Secrets are read only through `src/lib/env.js` and `src/lib/settings` (server-only, validated). Credentials saved in the admin are AES-256-GCM encrypted at rest. Nothing secret uses `NEXT_PUBLIC_`.
- Sessions: random 256-bit token in an HttpOnly, SameSite=Lax cookie (`__Host-` + Secure in production); only an HMAC of it is stored in the `Session` table. Admin sessions expire after 12 h, customer sessions after 30 days.
- Authorization is enforced server-side in every admin/account layout, page, Server Action and API route (`requireAdmin`, `assertAdmin`…). Non-admins get a 404 on `/admin`.
- New accounts are always `CUSTOMER`; admins are created only via `npm run admin:create`.
- All input is validated with Zod on the server. API errors use one envelope and never include stacks or internal details.
- Login is rate-limited and timing-safe against account enumeration.
# 4broo.com
# 4broo.com
