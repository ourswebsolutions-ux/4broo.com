// Launch catalogue seeder — `npm run prisma:db:products-seed`
//
// Adds the 20 curated 4 BRO products (5 per department) from prisma/seed-data/products.mjs.
// Production-safe and idempotent:
//   - never deletes or resets anything; never touches orders, users, settings or other products;
//   - products are matched by slug (and their style SKU), so re-running never duplicates;
//   - an existing product is SKIPPED (admin edits, stock and status are preserved), except
//     that missing seed images / translations are added back ("repaired");
//   - `--refresh` additionally updates the seeded copy, prices and flags of existing seed
//     products and re-syncs their seed images — still never stock, variants or status;
//   - categories are found by slug and only created when missing (never renamed).
// Exits non-zero if any critical operation fails.
//
// Images are static files in public/images/products/<slug>/<n>.jpg (deployed with the app),
// recorded with publicId "local/products/<slug>/<n>" — they are not Cloudinary assets.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { disconnectDb, getDb } from "../src/lib/db.js";
import { createProduct } from "../src/services/productService.js";
import { CATEGORY_TREE, PRODUCTS } from "./seed-data/products.mjs";

const REFRESH = process.argv.includes("--refresh");
const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));
const IMAGE = { width: 1000, height: 1250 };

const imagePath = (slug, index) => `/images/products/${slug}/${index + 1}.jpg`;
const imagePublicId = (slug, index) => `local/products/${slug}/${index + 1}`;

const effectivePrice = (product) => (product.onSale && product.salePrice ? product.salePrice : product.price);

function variantsOf(product) {
  return product.colours.flatMap((colour) => {
    const sizes = colour.sizes ?? [colour.size ?? null];
    return sizes.map((size, index) => ({
      sku: [product.sku, colour.code, size].filter(Boolean).join("-").toUpperCase(),
      size,
      color: colour.color ?? null,
      colorHex: colour.colorHex ?? null,
      stock: Array.isArray(colour.stock) ? colour.stock[index] : colour.stock,
    }));
  });
}

function imagesOf(product) {
  return product.images.map((alt, index) => ({
    url: imagePath(product.slug, index),
    publicId: imagePublicId(product.slug, index),
    alt,
    ...IMAGE,
    sortOrder: index,
    isPrimary: index === 0,
  }));
}

/** Fail before writing anything if the data or image files are incomplete. */
function preflight() {
  const problems = [];
  const slugs = new Set();
  const skus = new Set();
  const perDepartment = {};
  for (const product of PRODUCTS) {
    if (slugs.has(product.slug)) problems.push(`duplicate slug ${product.slug}`);
    if (skus.has(product.sku)) problems.push(`duplicate SKU ${product.sku}`);
    slugs.add(product.slug);
    skus.add(product.sku);
    const department = Object.entries(CATEGORY_TREE).find(([, d]) => product.category in d.children)?.[0];
    if (!department) problems.push(`${product.slug}: unknown category ${product.category}`);
    perDepartment[department] = (perDepartment[department] ?? 0) + 1;
    product.images.forEach((_, index) => {
      if (!existsSync(`${PUBLIC_DIR}${imagePath(product.slug, index)}`)) problems.push(`missing image public${imagePath(product.slug, index)}`);
    });
  }
  for (const department of Object.keys(CATEGORY_TREE)) {
    if (perDepartment[department] !== 5) problems.push(`${department}: expected 5 products, found ${perDepartment[department] ?? 0}`);
  }
  if (problems.length) throw new Error(`Seed data check failed:\n  - ${problems.join("\n  - ")}`);
}

/** Find-or-create departments and subcategories by slug. Returns slug → id. */
async function ensureCategories(db, report) {
  const ids = {};
  for (const [index, [slug, department]] of Object.entries(CATEGORY_TREE).entries()) {
    let parent = await db.category.findUnique({ where: { slug } });
    if (!parent) {
      parent = await db.category.create({ data: { name: department.name, slug, sortOrder: index } });
      report.categoriesCreated.push(slug);
    }
    ids[slug] = parent.id;
    for (const [childIndex, [childSlug, childName]] of Object.entries(department.children).entries()) {
      let child = await db.category.findUnique({ where: { slug: childSlug } });
      if (!child) {
        child = await db.category.create({ data: { name: childName, slug: childSlug, parentId: parent.id, sortOrder: 100 + childIndex } });
        report.categoriesCreated.push(childSlug);
      } else if (child.parentId !== parent.id) {
        report.warnings.push(`category ${childSlug} exists under a different parent — left unchanged`);
      }
      ids[childSlug] = child.id;
    }
  }
  return ids;
}

async function syncTranslations(db, productId, product, { overwrite }) {
  let changed = 0;
  for (const [locale, text] of Object.entries(product.translations ?? {})) {
    const existing = await db.productTranslation.findUnique({ where: { productId_locale: { productId, locale } } });
    if (!existing) {
      await db.productTranslation.create({ data: { productId, locale, name: text.name, shortDescription: text.shortDescription ?? null } });
      changed++;
    } else if (overwrite) {
      await db.productTranslation.update({ where: { id: existing.id }, data: { name: text.name, shortDescription: text.shortDescription ?? null } });
      changed++;
    }
  }
  return changed;
}

/** Add seed images that are missing (by publicId). With overwrite, also refresh alt/order of seed images. */
async function syncImages(db, productId, product, { overwrite }) {
  const wanted = imagesOf(product);
  const existing = await db.productImage.findMany({ where: { productId } });
  const byPublicId = new Map(existing.map((image) => [image.publicId, image]));
  const hasPrimary = existing.some((image) => image.isPrimary);
  let changed = 0;
  for (const image of wanted) {
    const current = byPublicId.get(image.publicId);
    if (!current) {
      const owner = await db.productImage.findUnique({ where: { publicId: image.publicId }, select: { productId: true } });
      if (owner) continue; // belongs to another product — never move it
      await db.productImage.create({ data: { ...image, productId, isPrimary: image.isPrimary && !hasPrimary } });
      changed++;
    } else if (overwrite && (current.alt !== image.alt || current.url !== image.url)) {
      await db.productImage.update({ where: { id: current.id }, data: { alt: image.alt, url: image.url, width: image.width, height: image.height } });
      changed++;
    }
  }
  return changed;
}

async function seedProduct(db, product, categoryIds, report) {
  const categoryId = categoryIds[product.category];
  const [bySlug, bySku] = await Promise.all([
    db.product.findUnique({ where: { slug: product.slug }, select: { id: true, sku: true } }),
    db.product.findUnique({ where: { sku: product.sku }, select: { id: true, slug: true } }),
  ]);

  // A different product already uses this slug or SKU: leave it alone.
  if ((bySlug && bySlug.sku !== product.sku) || (!bySlug && bySku)) {
    report.skipped.push(`${product.slug} (slug or SKU already used by another product — not modified)`);
    return;
  }

  if (!bySlug) {
    const variantSkus = variantsOf(product).map((variant) => variant.sku);
    const taken = await db.productVariant.findMany({ where: { sku: { in: variantSkus } }, select: { sku: true } });
    if (taken.length) {
      report.skipped.push(`${product.slug} (variant SKU ${taken[0].sku} already in use — not created)`);
      return;
    }
    const created = await createProduct({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      material: product.material,
      categoryId,
      gender: product.gender,
      status: "PUBLISHED",
      price: product.price,
      salePrice: product.salePrice ?? null,
      onSale: Boolean(product.onSale),
      featured: Boolean(product.featured),
      newArrival: Boolean(product.newArrival),
      bestSeller: false,
      variants: variantsOf(product),
    });
    try {
      await syncImages(db, created.id, product, { overwrite: false });
      await syncTranslations(db, created.id, product, { overwrite: false });
    } catch (error) {
      // Roll back our own brand-new product so a re-run starts clean (it cannot have orders yet).
      await db.product.delete({ where: { id: created.id } }).catch(() => {});
      throw error;
    }
    report.created.push(product.slug);
    return;
  }

  if (REFRESH) {
    await db.product.update({
      where: { id: bySlug.id },
      data: {
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        material: product.material,
        categoryId,
        gender: product.gender,
        price: product.price,
        salePrice: product.salePrice ?? null,
        onSale: Boolean(product.onSale),
        effectivePrice: effectivePrice(product),
        featured: Boolean(product.featured),
        newArrival: Boolean(product.newArrival),
      },
    });
    await syncImages(db, bySlug.id, product, { overwrite: true });
    await syncTranslations(db, bySlug.id, product, { overwrite: true });
    report.updated.push(product.slug);
    return;
  }

  const repaired = (await syncImages(db, bySlug.id, product, { overwrite: false })) + (await syncTranslations(db, bySlug.id, product, { overwrite: false }));
  (repaired ? report.repaired : report.skipped).push(repaired ? product.slug : `${product.slug} (already present — unchanged)`);
}

const report = { categoriesCreated: [], created: [], updated: [], repaired: [], skipped: [], failed: [], warnings: [] };

try {
  preflight();
  const db = getDb();
  const categoryIds = await ensureCategories(db, report);
  for (const product of PRODUCTS) {
    try {
      await seedProduct(db, product, categoryIds, report);
    } catch (error) {
      report.failed.push(`${product.slug}: ${error.internalMessage ?? error.message}${error.fieldErrors ? ` ${JSON.stringify(error.fieldErrors)}` : ""}`);
    }
  }

  console.log(`\n4 BRO launch catalogue — ${PRODUCTS.length} products${REFRESH ? " (refresh)" : ""}`);
  console.log(`  ✓ categories created: ${report.categoriesCreated.length}${report.categoriesCreated.length ? ` (${report.categoriesCreated.join(", ")})` : ""}`);
  console.log(`  ✓ products created:   ${report.created.length}`);
  if (REFRESH) console.log(`  ✓ products updated:   ${report.updated.length}`);
  console.log(`  ✓ products repaired:  ${report.repaired.length}${report.repaired.length ? ` (${report.repaired.join(", ")})` : ""}`);
  console.log(`  – products skipped:   ${report.skipped.length}`);
  for (const line of report.skipped) console.log(`      ${line}`);
  for (const line of report.warnings) console.log(`  ! ${line}`);
  if (report.failed.length) {
    console.error(`  ✗ failed: ${report.failed.length}`);
    for (const line of report.failed) console.error(`      ${line}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`✗ Product seed failed: ${error.internalMessage ?? error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDb().catch(() => {});
}
