// Structural seed — safe to run repeatedly (`npm run db:seed`).
//
// Creates ONLY the category structure needed to start working:
//   departments (Men, Women, Kids, Accessories) + initial subcategories,
//   and Urdu/Hindi names for departments and subcategories.
// Existing rows are never overwritten (upsert with an empty update), so later
// edits made by admins survive re-seeding.
//
// It never creates products, customers, orders, reviews or sales.
// Optional admin bootstrap: set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD
// (+ SEED_ADMIN_FIRST_NAME / SEED_ADMIN_LAST_NAME). No password is ever hard-coded.
import { hashPassword } from "../src/lib/auth/password.js";
import { disconnectDb, getDb } from "../src/lib/db.js";
import { newPasswordSchema } from "../src/lib/validation/schemas/auth.js";
import { emailSchema, personNameSchema } from "../src/lib/validation/schemas/common.js";

const STRUCTURE = [
  {
    name: "Men",
    slug: "men",
    translations: { ur: "مرد", hi: "पुरुष" },
    children: ["T-Shirts", "Shirts", "Hoodies", "Jackets", "Pants", "Trousers", "Tracksuits"],
  },
  {
    name: "Women",
    slug: "women",
    translations: { ur: "خواتین", hi: "महिलाएँ" },
    children: ["Dresses", "Tops", "Shirts", "Hoodies", "Jackets", "Pants", "Tracksuits"],
  },
  {
    name: "Kids",
    slug: "kids",
    translations: { ur: "بچے", hi: "बच्चे" },
    children: ["T-Shirts", "Shirts", "Hoodies", "Pants", "Tracksuits"],
  },
  {
    name: "Accessories",
    slug: "accessories",
    translations: { ur: "لوازمات", hi: "एक्सेसरीज़" },
    // Accessory slugs are unprefixed: they back /collections/bags, /collections/watches…
    children: ["Bags", "Hand Bags", "Perfumes", "Watches", "Fashion Accessories"],
    unprefixed: true,
  },
];

// Urdu / Hindi names for subcategories (keyed by English name).
const CHILD_TRANSLATIONS = {
  "T-Shirts": { ur: "ٹی شرٹس", hi: "टी-शर्ट" },
  Shirts: { ur: "شرٹس", hi: "शर्ट" },
  Hoodies: { ur: "ہوڈیز", hi: "हुडी" },
  Jackets: { ur: "جیکٹس", hi: "जैकेट" },
  Pants: { ur: "پینٹس", hi: "पैंट" },
  Trousers: { ur: "ٹراؤزرز", hi: "ट्राउज़र" },
  Tracksuits: { ur: "ٹریک سوٹس", hi: "ट्रैकसूट" },
  Dresses: { ur: "ڈریسز", hi: "ड्रेस" },
  Tops: { ur: "ٹاپس", hi: "टॉप" },
  Bags: { ur: "بیگز", hi: "बैग" },
  "Hand Bags": { ur: "ہینڈ بیگز", hi: "हैंडबैग" },
  Perfumes: { ur: "پرفیوم", hi: "परफ़्यूम" },
  Watches: { ur: "گھڑیاں", hi: "घड़ियाँ" },
  "Fashion Accessories": { ur: "فیشن لوازمات", hi: "फ़ैशन एक्सेसरीज़" },
};

async function upsertTranslations(db, categoryId, translations = {}) {
  for (const [locale, name] of Object.entries(translations)) {
    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale } },
      update: {},
      create: { categoryId, locale, name },
    });
  }
}

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function seedCategories(db) {
  let created = 0;
  let total = 0;

  for (const [departmentIndex, department] of STRUCTURE.entries()) {
    const before = await db.category.count();
    const parent = await db.category.upsert({
      where: { slug: department.slug },
      update: {},
      create: { name: department.name, slug: department.slug, sortOrder: departmentIndex },
    });

    await upsertTranslations(db, parent.id, department.translations);

    for (const [childIndex, childName] of department.children.entries()) {
      const slug = department.unprefixed ? slugify(childName).replace(/^hand-bags$/, "handbags") : `${department.slug}-${slugify(childName)}`;
      const child = await db.category.upsert({
        where: { slug },
        update: {},
        create: { name: childName, slug, parentId: parent.id, sortOrder: childIndex },
      });
      await upsertTranslations(db, child.id, CHILD_TRANSLATIONS[childName]);
    }

    total += 1 + department.children.length;
    created += (await db.category.count()) - before;
  }

  console.log(`✓ Categories: ${total} in structure, ${created} newly created, ${total - created} already present`);
}

async function seedAdmin(db) {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_FIRST_NAME, SEED_ADMIN_LAST_NAME } = process.env;
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.log("– Admin: skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or run `npm run admin:create`)");
    return;
  }

  const email = emailSchema.parse(SEED_ADMIN_EMAIL);
  const password = newPasswordSchema.parse(SEED_ADMIN_PASSWORD);
  const existing = await db.user.findUnique({ where: { email }, select: { role: true } });

  if (existing) {
    console.log(
      existing.role === "ADMIN"
        ? "✓ Admin: already exists (password unchanged)"
        : "! Admin: an account with this email exists as CUSTOMER — promote it deliberately with `npm run admin:create`",
    );
    return;
  }

  await db.user.create({
    data: {
      email,
      firstName: personNameSchema.parse(SEED_ADMIN_FIRST_NAME || "Store"),
      lastName: personNameSchema.parse(SEED_ADMIN_LAST_NAME || "Admin"),
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
  console.log("✓ Admin: created — remove SEED_ADMIN_PASSWORD from the environment now");
}

try {
  const db = getDb();
  await seedCategories(db);
  await seedAdmin(db);
} catch (error) {
  console.error(`✗ Seed failed: ${error.internalMessage ?? error.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDb().catch(() => {});
}
