// The 4 BRO launch catalogue: 20 products (5 per department), used by
// prisma/seed-products.mjs. Prices are PKR. Stock is the opening stock per variant.
//
// Images live in public/images/products/<slug>/<n>.jpg (1000×1250, 4:5), composed from
// Unsplash-licensed photography (free for commercial use) — sources in docs/MEDIA_CREDITS.md.
// No product is flagged "best seller": that flag is for products that have actually sold.

const LETTER = ["S", "M", "L", "XL"];
const LETTER_XXL = ["S", "M", "L", "XL", "XXL"];
const KIDS = ["3-4Y", "5-6Y", "7-8Y", "9-10Y"];

/**
 * @typedef {{ color?: string, colorHex?: string, code?: string, sizes?: string[], stock: number | number[] }} Colourway
 * Variant SKUs are `${sku}-${colour code}-${size}` (or shorter when size/colour do not apply).
 */
export const PRODUCTS = [
  // ── Men ────────────────────────────────────────────────────────────────────
  {
    slug: "oxford-cotton-shirt",
    sku: "4B-M-OXF",
    category: "men-shirts",
    gender: "MEN",
    name: "Oxford Cotton Shirt",
    shortDescription: "A crisp button-down in breathable Oxford cotton — sharp enough for the office, relaxed enough for the weekend.",
    description:
      "Cut from a midweight Oxford cotton with a soft hand and a subtle basket weave, this shirt is the foundation of a considered wardrobe.\n\nA classic point collar, a clean front without a chest pocket and a curved hem that works tucked or untucked. Mother-of-pearl-effect buttons and clean single-needle stitching finish it.\n\nRegular fit. Model is 183 cm and wears size M.",
    material: "100% cotton Oxford",
    price: "6490",
    newArrival: true,
    featured: true,
    colours: [
      { color: "White", colorHex: "#F5F3EE", code: "WHT", sizes: LETTER_XXL, stock: [6, 10, 10, 8, 4] },
      { color: "Sky Blue", colorHex: "#A9C3DC", code: "SKY", sizes: LETTER, stock: [4, 8, 8, 5] },
    ],
    images: ["White Oxford cotton shirt worn with beige chinos", "Collar and placket detail of the white Oxford shirt"],
    translations: {
      ur: { name: "آکسفورڈ کاٹن شرٹ", shortDescription: "سانس لینے والے آکسفورڈ کاٹن میں صاف ستھری بٹن ڈاؤن شرٹ — دفتر اور ویک اینڈ دونوں کے لیے۔" },
      hi: { name: "ऑक्सफ़र्ड कॉटन शर्ट", shortDescription: "हवादार ऑक्सफ़र्ड कॉटन की क्रिस्प बटन-डाउन शर्ट — ऑफ़िस और वीकेंड दोनों के लिए।" },
    },
  },
  {
    slug: "heavyweight-fleece-hoodie",
    sku: "4B-M-HDY",
    category: "men-hoodies",
    gender: "MEN",
    name: "Heavyweight Fleece Hoodie",
    shortDescription: "A substantial brushed-fleece hoodie with a structured hood and a clean, logo-free front.",
    description:
      "Built from a dense 400 gsm cotton-rich fleece, brushed inside for warmth and finished smooth outside so it holds its shape wash after wash.\n\nA double-layer hood, kangaroo pocket, ribbed cuffs and hem, and dropped shoulders for an easy, modern silhouette.\n\nRelaxed fit — take your usual size for room, size down for a closer fit.",
    material: "80% cotton, 20% polyester brushed fleece, 400 gsm",
    price: "8990",
    salePrice: "7490",
    onSale: true,
    featured: true,
    colours: [
      { color: "Charcoal", colorHex: "#3B3D40", code: "CHR", sizes: LETTER_XXL, stock: [5, 9, 9, 6, 3] },
      { color: "Black", colorHex: "#0B0B0A", code: "BLK", sizes: LETTER_XXL, stock: [5, 10, 10, 7, 4] },
    ],
    images: ["Charcoal heavyweight fleece hoodie worn with the hood up", "Black fleece hoodie styled against a brick wall"],
    translations: {
      ur: { name: "ہیوی ویٹ فلیس ہوڈی", shortDescription: "موٹے برشڈ فلیس کی ہوڈی، مضبوط ہُڈ اور سادہ، بغیر لوگو کے سامنے کے ساتھ۔" },
      hi: { name: "हैवीवेट फ़्लीस हुडी", shortDescription: "मज़बूत हुड और सादे, बिना लोगो वाले फ़्रंट के साथ मोटी ब्रश्ड-फ़्लीस हुडी।" },
    },
  },
  {
    slug: "washed-denim-trucker-jacket",
    sku: "4B-M-DNJ",
    category: "men-jackets",
    gender: "MEN",
    name: "Washed Denim Trucker Jacket",
    shortDescription: "The trucker jacket, refined — rigid cotton denim with a lived-in mid-blue wash.",
    description:
      "A wardrobe classic in 13 oz cotton denim, garment-washed to a soft mid-blue that only gets better with wear.\n\nPointed flap chest pockets, side hand pockets, adjustable waist tabs and tonal metal shank buttons. Layer it over a tee or a hoodie through the seasons.\n\nRegular fit, hip length.",
    material: "100% cotton denim, 13 oz",
    price: "12990",
    newArrival: true,
    colours: [{ color: "Mid Blue", colorHex: "#4F6F94", code: "MBL", sizes: LETTER_XXL, stock: [4, 7, 7, 5, 2] }],
    images: ["Mid-blue washed denim trucker jacket worn over a white tee", "Close-up of the denim jacket buttons and chest pockets"],
    translations: {
      ur: { name: "واشڈ ڈینم ٹرکر جیکٹ", shortDescription: "نفیس ٹرکر جیکٹ — مضبوط کاٹن ڈینم، ہلکے استعمال شدہ نیلے رنگ میں۔" },
      hi: { name: "वॉश्ड डेनिम ट्रकर जैकेट", shortDescription: "निखरी हुई ट्रकर जैकेट — मज़बूत कॉटन डेनिम, हल्के घिसे मिड-ब्लू वॉश में।" },
    },
  },
  {
    slug: "tailored-cotton-chinos",
    sku: "4B-M-CHN",
    category: "men-trousers",
    gender: "MEN",
    name: "Tailored Cotton Chinos",
    shortDescription: "Clean, tapered chinos in stretch cotton twill — the everyday trouser, perfected.",
    description:
      "Woven from a cotton twill with a touch of stretch for comfort, these chinos sit at the natural waist and taper gently to the ankle.\n\nSlant front pockets, welt back pockets, a concealed zip fly and a clean finish at the hem. Pairs with everything from an Oxford shirt to a heavyweight hoodie.\n\nSlim-tapered fit. Waist sizes in inches.",
    material: "98% cotton, 2% elastane twill",
    price: "6990",
    colours: [
      { color: "Khaki", colorHex: "#B9A47E", code: "KHK", sizes: ["30", "32", "34", "36"], stock: [5, 9, 8, 4] },
      { color: "Stone", colorHex: "#D8CDB8", code: "STN", sizes: ["30", "32", "34", "36"], stock: [4, 7, 7, 3] },
    ],
    images: ["Khaki tailored cotton chinos with white sneakers", "Stone chinos styled with a white Oxford shirt"],
    translations: {
      ur: { name: "ٹیلرڈ کاٹن چائنوز", shortDescription: "اسٹریچ کاٹن ٹوِل میں صاف، ٹیپرڈ چائنوز — روزمرہ کی بہترین پتلون۔" },
      hi: { name: "टेलर्ड कॉटन चिनोज़", shortDescription: "स्ट्रेच कॉटन ट्विल में साफ़, टेपर्ड चिनोज़ — रोज़ की बेहतरीन ट्राउज़र।" },
    },
  },
  {
    slug: "essential-cotton-crew-tee",
    sku: "4B-M-TEE",
    category: "men-t-shirts",
    gender: "MEN",
    name: "Essential Cotton Crew Tee",
    shortDescription: "A heavyweight combed-cotton T-shirt with a tight ribbed neckline that keeps its shape.",
    description:
      "The tee everything else is built on. Knitted from long-staple combed cotton at 220 gsm — substantial, smooth and opaque.\n\nA close ribbed crew neck, taped shoulder seams and a straight hem. Pre-shrunk, so the fit you buy is the fit you keep.\n\nRegular fit.",
    material: "100% combed cotton jersey, 220 gsm",
    price: "2990",
    newArrival: true,
    colours: [
      { color: "White", colorHex: "#FFFFFF", code: "WHT", sizes: LETTER_XXL, stock: [10, 16, 16, 10, 6] },
      { color: "Black", colorHex: "#0B0B0A", code: "BLK", sizes: LETTER_XXL, stock: [10, 14, 14, 9, 5] },
    ],
    images: ["White essential cotton crew tee on model", "White crew neck tee on a wooden hanger"],
    translations: {
      ur: { name: "ایسنشل کاٹن کریو ٹی", shortDescription: "موٹے کومبڈ کاٹن کی ٹی شرٹ، مضبوط رِبڈ گلے کے ساتھ جو اپنی شکل برقرار رکھتا ہے۔" },
      hi: { name: "एसेंशियल कॉटन क्रू टी", shortDescription: "मज़बूत रिब्ड नेकलाइन वाली मोटी कॉम्ब्ड-कॉटन टी-शर्ट जो अपना आकार बनाए रखती है।" },
    },
  },

  // ── Women ──────────────────────────────────────────────────────────────────
  {
    slug: "satin-slip-dress",
    sku: "4B-W-SLP",
    category: "women-dresses",
    gender: "WOMEN",
    name: "Satin Slip Dress",
    shortDescription: "A bias-cut slip dress in fluid satin with fine adjustable straps and a softly shaped V neckline.",
    description:
      "Cut on the bias so it skims rather than clings, this slip dress moves beautifully and catches the light with every step.\n\nFine adjustable straps, a softly shaped V neckline and a midi length. Wear it alone for evenings, or layer it over a fine knit and under a trench for day.\n\nTrue to size. Dry clean or gentle hand wash.",
    material: "100% polyester satin",
    price: "11990",
    featured: true,
    newArrival: true,
    colours: [
      { color: "Black", colorHex: "#0B0B0A", code: "BLK", sizes: ["XS", "S", "M", "L"], stock: [4, 7, 7, 4] },
      { color: "Silver Grey", colorHex: "#A7A9AC", code: "SLV", sizes: ["XS", "S", "M", "L"], stock: [3, 5, 5, 3] },
    ],
    images: ["Black satin slip dress worn by a window", "Black satin slip dress detail with fine straps", "Silver grey satin slip dress layered with a black coat"],
    translations: {
      ur: { name: "ساٹن سلپ ڈریس", shortDescription: "بہتے ہوئے ساٹن میں بائس کٹ سلپ ڈریس، باریک ایڈجسٹ ایبل اسٹریپس کے ساتھ۔" },
      hi: { name: "सैटिन स्लिप ड्रेस", shortDescription: "बहते सैटिन में बायस-कट स्लिप ड्रेस, पतली एडजस्टेबल स्ट्रैप्स के साथ।" },
    },
  },
  {
    slug: "belted-cotton-trench-coat",
    sku: "4B-W-TRC",
    category: "women-jackets",
    gender: "WOMEN",
    name: "Belted Cotton Trench Coat",
    shortDescription: "A timeless double-breasted trench in water-repellent cotton gabardine, finished with a tie belt.",
    description:
      "An investment piece cut from tightly woven cotton gabardine with a water-repellent finish.\n\nDouble-breasted front, storm flap, epaulettes, buckled cuff straps and a removable tie belt to define the waist. The relaxed, longline shape layers easily over knits and tailoring.\n\nRelaxed fit, below-the-knee length.",
    material: "100% cotton gabardine, water-repellent finish; viscose lining",
    price: "18990",
    salePrice: "15990",
    onSale: true,
    featured: true,
    colours: [{ color: "Camel", colorHex: "#C2A47E", code: "CML", sizes: ["XS", "S", "M", "L", "XL"], stock: [3, 5, 6, 4, 2] }],
    images: ["Camel belted cotton trench coat worn open in the city", "Camel trench coat at a station platform"],
    translations: {
      ur: { name: "بیلٹڈ کاٹن ٹرینچ کوٹ", shortDescription: "پانی سے محفوظ کاٹن گیبرڈین میں کلاسک ڈبل بریسٹڈ ٹرینچ، بیلٹ کے ساتھ۔" },
      hi: { name: "बेल्टेड कॉटन ट्रेंच कोट", shortDescription: "वॉटर-रिपेलेंट कॉटन गैबर्डीन में क्लासिक डबल-ब्रेस्टेड ट्रेंच, टाई बेल्ट के साथ।" },
    },
  },
  {
    slug: "relaxed-wide-leg-trousers",
    sku: "4B-W-WLT",
    category: "women-pants",
    gender: "WOMEN",
    name: "Relaxed Wide-Leg Trousers",
    shortDescription: "High-rise, fluid wide-leg trousers with an easy elasticated back waist.",
    description:
      "Effortless and polished at once: a high rise, a flat front and a full, floor-skimming wide leg.\n\nA partially elasticated back waist for comfort, side pockets and a clean hem. Dress them up with a satin top or keep it simple with a white tee.\n\nRelaxed fit, full length.",
    material: "Sand: 55% linen, 45% viscose · Denim Blue: 100% cotton",
    price: "6490",
    newArrival: true,
    colours: [
      { color: "Sand", colorHex: "#CDBF9F", code: "SND", sizes: ["XS", "S", "M", "L", "XL"], stock: [4, 7, 8, 5, 3] },
      { color: "Denim Blue", colorHex: "#5A7CA3", code: "DNM", sizes: ["XS", "S", "M", "L", "XL"], stock: [3, 6, 6, 4, 2] },
    ],
    images: ["Sand relaxed wide-leg trousers, back view", "Denim blue wide-leg trousers, back view"],
    translations: {
      ur: { name: "ریلیکسڈ وائیڈ لیگ ٹراؤزرز", shortDescription: "اونچی کمر، روانی والے چوڑے پائنچوں کے ٹراؤزرز، آرام دہ لچکدار کمر کے ساتھ۔" },
      hi: { name: "रिलैक्स्ड वाइड-लेग ट्राउज़र", shortDescription: "हाई-राइज़, बहती चौड़ी टांग वाले ट्राउज़र, आरामदायक इलास्टिक बैक वेस्ट के साथ।" },
    },
  },
  {
    slug: "ribbed-knit-top",
    sku: "4B-W-RKT",
    category: "women-tops",
    gender: "WOMEN",
    name: "Ribbed Knit Top",
    shortDescription: "A close-fitting sleeveless top in stretch rib knit with a softly sculpted hem.",
    description:
      "A versatile layer knitted in a fine stretch rib that hugs without restricting.\n\nA high crew neckline, sleeveless armholes and a softly sculpted cropped hem that sits neatly over high-rise trousers and jeans.\n\nSlim fit. Model is 172 cm and wears size S.",
    material: "70% viscose, 30% polyamide rib knit",
    price: "3990",
    colours: [
      { color: "Ivory", colorHex: "#F2EDE3", code: "IVR", sizes: ["XS", "S", "M", "L"], stock: [5, 8, 8, 5] },
      { color: "Heather Grey", colorHex: "#9A9A98", code: "GRY", sizes: ["XS", "S", "M", "L"], stock: [4, 7, 7, 4] },
    ],
    images: ["Ivory ribbed knit top with light-wash jeans", "Heather grey ribbed knit top with dark trousers"],
    translations: {
      ur: { name: "رِبڈ نِٹ ٹاپ", shortDescription: "اسٹریچ رِب نِٹ میں فٹڈ بغیر آستین کا ٹاپ، نرمی سے تراشیدہ کنارے کے ساتھ۔" },
      hi: { name: "रिब्ड निट टॉप", shortDescription: "स्ट्रेच रिब निट में फ़िटेड स्लीवलेस टॉप, हल्के तराशे हुए हेम के साथ।" },
    },
  },
  {
    slug: "oversized-poplin-shirt",
    sku: "4B-W-PPS",
    category: "women-shirts",
    gender: "WOMEN",
    name: "Oversized Poplin Shirt",
    shortDescription: "A crisp, generously cut white shirt in cotton poplin with dropped shoulders and a long curved hem.",
    description:
      "The white shirt, reconsidered. Crisp cotton poplin cut with volume — dropped shoulders, full sleeves and a longer curved hem.\n\nWear it buttoned and tucked, open over a slip dress, or knotted at the waist. Concealed button placket for a clean finish.\n\nOversized fit — size down for a closer look.",
    material: "100% cotton poplin",
    price: "5990",
    featured: true,
    colours: [{ color: "White", colorHex: "#FFFFFF", code: "WHT", sizes: ["XS", "S", "M", "L"], stock: [5, 9, 9, 5] }],
    images: ["White oversized poplin shirt worn loose", "White poplin shirt styled with denim"],
    translations: {
      ur: { name: "اوور سائزڈ پاپلن شرٹ", shortDescription: "کاٹن پاپلن میں کھلی کٹ والی سفید شرٹ، ڈھلکے کندھوں اور لمبے گولائی دار کنارے کے ساتھ۔" },
      hi: { name: "ओवरसाइज़्ड पॉपलिन शर्ट", shortDescription: "कॉटन पॉपलिन में खुले कट की सफ़ेद शर्ट, ड्रॉप्ड शोल्डर और लंबे घुमावदार हेम के साथ।" },
    },
  },

  // ── Kids ───────────────────────────────────────────────────────────────────
  {
    slug: "kids-fleece-hoodie",
    sku: "4B-K-HDY",
    category: "kids-hoodies",
    gender: "KIDS",
    name: "Kids Fleece Hoodie",
    shortDescription: "A soft brushed-fleece pullover hoodie for everyday play — warm, easy and made to be washed often.",
    description:
      "Made for busy days: a cosy cotton-rich fleece, brushed inside and finished smooth outside.\n\nA lined hood with no drawcords (safer for little ones), a front pouch pocket and ribbed cuffs and hem that keep their shape. Machine washable.\n\nRegular fit with room to grow.",
    material: "80% cotton, 20% polyester brushed fleece",
    price: "4490",
    newArrival: true,
    colours: [{ color: "Cloud White", colorHex: "#F1F2F4", code: "WHT", sizes: KIDS, stock: [6, 8, 8, 5] }],
    images: ["Child wearing the cloud white fleece hoodie with jeans", "Front detail of the kids fleece hoodie"],
    translations: {
      ur: { name: "کڈز فلیس ہوڈی", shortDescription: "روزمرہ کھیل کے لیے نرم برشڈ فلیس ہوڈی — گرم، آسان اور بار بار دھونے کے قابل۔" },
      hi: { name: "किड्स फ़्लीस हुडी", shortDescription: "रोज़ के खेल के लिए मुलायम ब्रश्ड-फ़्लीस हुडी — गर्म, आसान और बार-बार धोने लायक।" },
    },
  },
  {
    slug: "kids-short-sleeve-shirt",
    sku: "4B-K-SSS",
    category: "kids-shirts",
    gender: "KIDS",
    name: "Kids Short-Sleeve Shirt",
    shortDescription: "A smart short-sleeve cotton shirt in a fresh gingham or a playful navy print.",
    description:
      "Smart enough for family occasions, comfortable enough for the rest of the day.\n\nSoft breathable cotton, a neat collar, easy front buttons for small hands and a straight hem that looks good untucked.\n\nRegular fit.",
    material: "100% cotton",
    price: "3290",
    colours: [
      { color: "Aqua Gingham", colorHex: "#7FC3C0", code: "AQG", sizes: KIDS, stock: [5, 7, 7, 4] },
      { color: "Navy Print", colorHex: "#1F2A4A", code: "NVP", sizes: KIDS, stock: [5, 7, 6, 4] },
    ],
    images: ["Boy wearing the aqua gingham short-sleeve shirt in a wheat field", "Boy wearing the navy print short-sleeve shirt with khaki shorts"],
    translations: {
      ur: { name: "کڈز ہاف سلیو شرٹ", shortDescription: "تازہ گنگھم یا نیوی پرنٹ میں اسمارٹ ہاف آستین کاٹن شرٹ۔" },
      hi: { name: "किड्स हाफ़-स्लीव शर्ट", shortDescription: "फ़्रेश गिंघम या नेवी प्रिंट में स्मार्ट हाफ़-स्लीव कॉटन शर्ट।" },
    },
  },
  {
    slug: "kids-printed-cotton-tee",
    sku: "4B-K-TEE",
    category: "kids-t-shirts",
    gender: "KIDS",
    name: "Kids Printed Cotton Tee",
    shortDescription: "A soft cotton T-shirt in a cheerful all-over print or a rainbow stripe.",
    description:
      "Everyday tees that keep up: soft single-jersey cotton that washes well and stays bright.\n\nA comfortable ribbed crew neck and a relaxed body with room to move.\n\nRelaxed fit.",
    material: "100% cotton jersey",
    price: "1990",
    salePrice: "1690",
    onSale: true,
    colours: [
      { color: "Toy Print", colorHex: "#E9EEF3", code: "PRT", sizes: KIDS, stock: [8, 10, 10, 6] },
      { color: "Rainbow Stripe", colorHex: "#EFE7DA", code: "STR", sizes: KIDS, stock: [7, 9, 9, 6] },
    ],
    images: ["Child laughing in the toy print cotton tee", "Child wearing the rainbow stripe cotton tee"],
    translations: {
      ur: { name: "کڈز پرنٹڈ کاٹن ٹی", shortDescription: "خوشگوار پرنٹ یا رینبو اسٹرائپ میں نرم کاٹن ٹی شرٹ۔" },
      hi: { name: "किड्स प्रिंटेड कॉटन टी", shortDescription: "खुशनुमा प्रिंट या रेनबो स्ट्राइप में मुलायम कॉटन टी-शर्ट।" },
    },
  },
  {
    slug: "kids-relaxed-joggers",
    sku: "4B-K-JOG",
    category: "kids-pants",
    gender: "KIDS",
    name: "Kids Relaxed Joggers",
    shortDescription: "Easy pull-on joggers in soft cotton with cuffed ankles — made for running, climbing and everything in between.",
    description:
      "Comfortable pull-on joggers in a soft cotton-blend loopback.\n\nAn elasticated waist with an inner adjustable cord, side pockets and ribbed ankle cuffs that stop them dragging. Machine washable.\n\nRelaxed fit.",
    material: "95% cotton, 5% elastane loopback",
    price: "2990",
    colours: [
      { color: "Ivory Palm", colorHex: "#EDE8DC", code: "IVP", sizes: KIDS, stock: [6, 8, 8, 5] },
      { color: "Mint", colorHex: "#D9E8C9", code: "MNT", sizes: KIDS, stock: [5, 7, 7, 4] },
    ],
    images: ["Child wearing ivory palm-print relaxed joggers", "Child wearing mint relaxed joggers"],
    translations: {
      ur: { name: "کڈز ریلیکسڈ جاگرز", shortDescription: "نرم کاٹن میں آسانی سے پہننے والے جاگرز، کف والے ٹخنوں کے ساتھ۔" },
      hi: { name: "किड्स रिलैक्स्ड जॉगर्स", shortDescription: "मुलायम कॉटन में आसानी से पहनने वाले जॉगर्स, कफ़्ड एंकल के साथ।" },
    },
  },
  {
    slug: "kids-colour-block-tracksuit",
    sku: "4B-K-TRK",
    category: "kids-tracksuits",
    gender: "KIDS",
    name: "Kids Colour-Block Tracksuit",
    shortDescription: "A two-piece fleece tracksuit — zip hoodie and cuffed joggers — with a reflective chest stripe.",
    description:
      "A matching zip-through hoodie and jogger set in a warm brushed fleece.\n\nThe jacket has a full zip, an attached hood and a reflective stripe across the chest for visibility on darker evenings; the joggers have an elasticated waist, side stripes and cuffed ankles.\n\nRegular fit. Sold as a set.",
    material: "70% cotton, 30% polyester brushed fleece",
    price: "6490",
    featured: true,
    colours: [
      { color: "Navy / Jade", colorHex: "#1E2A55", code: "NVJ", sizes: ["5-6Y", "7-8Y", "9-10Y", "11-12Y"], stock: [5, 7, 7, 4] },
      { color: "Black / Red", colorHex: "#151515", code: "BKR", sizes: ["5-6Y", "7-8Y", "9-10Y", "11-12Y"], stock: [5, 6, 6, 4] },
    ],
    images: ["Navy and jade colour-block kids tracksuit", "Navy and jade tracksuit, side and front views", "Black and red colour-block kids tracksuit"],
    translations: {
      ur: { name: "کڈز کلر بلاک ٹریک سوٹ", shortDescription: "دو حصوں والا فلیس ٹریک سوٹ — زِپ ہوڈی اور جاگرز — چمکدار پٹی کے ساتھ۔" },
      hi: { name: "किड्स कलर-ब्लॉक ट्रैकसूट", shortDescription: "दो-पीस फ़्लीस ट्रैकसूट — ज़िप हुडी और जॉगर्स — रिफ़्लेक्टिव स्ट्राइप के साथ।" },
    },
  },

  // ── Accessories ────────────────────────────────────────────────────────────
  {
    slug: "leather-weekender-bag",
    sku: "4B-A-WKD",
    category: "bags",
    gender: "UNISEX",
    name: "Leather Weekender Bag",
    shortDescription: "A full-grain leather holdall sized for two or three days away, with a detachable shoulder strap.",
    description:
      "Hand-finished full-grain leather that develops a rich patina with every journey.\n\nA spacious main compartment with a two-way zip, an inner zip pocket and slip pockets, rolled carry handles, a detachable padded shoulder strap and a matching luggage tag. Fits comfortably under most aircraft seats.\n\nDimensions: 52 × 28 × 26 cm.",
    material: "Full-grain leather; cotton canvas lining; antique-brass hardware",
    price: "24990",
    featured: true,
    colours: [
      { color: "Cognac", colorHex: "#8A4B24", code: "CGN", stock: 6 },
      { color: "Black", colorHex: "#0B0B0A", code: "BLK", stock: 4 },
    ],
    images: ["Cognac full-grain leather weekender bag", "Cognac leather weekender with luggage tag", "Black full-grain leather weekender bag"],
    translations: {
      ur: { name: "لیدر ویک اینڈر بیگ", shortDescription: "دو تین دن کے سفر کے لیے فُل گرین لیدر کا بیگ، الگ ہونے والے کندھے کے اسٹریپ کے ساتھ۔" },
      hi: { name: "लेदर वीकेंडर बैग", shortDescription: "दो-तीन दिन के सफ़र के लिए फ़ुल-ग्रेन लेदर होल्डऑल, अलग होने वाले शोल्डर स्ट्रैप के साथ।" },
    },
  },
  {
    slug: "structured-leather-handbag",
    sku: "4B-A-HBG",
    category: "handbags",
    gender: "WOMEN",
    name: "Structured Leather Handbag",
    shortDescription: "A polished top-handle bag in smooth leather with buckled straps and a detachable crossbody strap.",
    description:
      "A structured silhouette in smooth, lightly glazed leather — refined for the office, elegant for evenings.\n\nTwin rolled top handles, decorative buckled straps, a detachable adjustable shoulder strap, and an organised interior with zip and slip pockets.\n\nDimensions: 32 × 23 × 13 cm.",
    material: "Smooth cow leather; microfibre lining; gunmetal hardware",
    price: "18490",
    newArrival: true,
    colours: [{ color: "Tan", colorHex: "#9C5A2E", code: "TAN", stock: 7 }],
    images: ["Tan structured leather handbag with top handles", "Close-up of the tan handbag's smooth leather"],
    translations: {
      ur: { name: "اسٹرکچرڈ لیدر ہینڈ بیگ", shortDescription: "ہموار لیدر میں نفیس ٹاپ ہینڈل بیگ، بکل والے اسٹریپس اور کراس باڈی اسٹریپ کے ساتھ۔" },
      hi: { name: "स्ट्रक्चर्ड लेदर हैंडबैग", shortDescription: "स्मूद लेदर में निखरा टॉप-हैंडल बैग, बकल स्ट्रैप्स और क्रॉसबॉडी स्ट्रैप के साथ।" },
    },
  },
  {
    slug: "amber-oud-eau-de-parfum",
    sku: "4B-A-AOD",
    category: "perfumes",
    gender: "UNISEX",
    name: "Amber Oud Eau de Parfum",
    shortDescription: "A warm, long-lasting amber and oud fragrance with saffron at the opening and soft musk to finish. 100 ml.",
    description:
      "Rich and enveloping: saffron and bergamot open onto a heart of rose and smoky oud, settling into amber, vanilla and soft musk.\n\nEau de parfum concentration for lasting wear on skin and clothing. Unisex.\n\n100 ml spray. Keep away from direct sunlight and heat.",
    material: "Eau de parfum, 100 ml",
    price: "9990",
    newArrival: true,
    colours: [{ size: "100ml", stock: 18 }],
    images: ["Amber Oud eau de parfum bottle", "Amber Oud eau de parfum bottle in warm light"],
    translations: {
      ur: { name: "امبر عود او دے پرفیوم", shortDescription: "گرم، دیرپا امبر اور عود کی خوشبو، زعفران کے آغاز اور نرم مشک کے اختتام کے ساتھ۔ 100 ملی لیٹر۔" },
      hi: { name: "एम्बर ऊद ओ द परफ़्यूम", shortDescription: "गर्म, लंबे समय तक रहने वाली एम्बर और ऊद ख़ुशबू, केसर से शुरुआत और मुलायम मस्क के साथ। 100 ml।" },
    },
  },
  {
    slug: "rose-gold-minimal-watch",
    sku: "4B-A-WCH",
    category: "watches",
    gender: "UNISEX",
    name: "Rose Gold Minimal Watch",
    shortDescription: "A slim 38 mm watch with a clean white dial, rose-gold case and a soft taupe leather strap.",
    description:
      "Quiet, considered design: a slim 38 mm stainless-steel case in a rose-gold finish, a clean white dial with fine baton indices and slender hands.\n\nPrecise Japanese quartz movement, scratch-resistant mineral glass, water resistant to 3 ATM (splash-proof), and a soft Italian-style leather strap with a matching pin buckle.\n\nCase: 38 mm · Thickness: 7 mm · Strap width: 20 mm.",
    material: "Stainless steel case (rose-gold finish); genuine leather strap",
    price: "21990",
    salePrice: "18990",
    onSale: true,
    featured: true,
    colours: [{ color: "Rose Gold / Taupe", colorHex: "#B76E79", code: "RGT", stock: 9 }],
    images: ["Rose gold minimal watch with white dial and taupe strap", "Close-up of the white dial and rose-gold case"],
    translations: {
      ur: { name: "روز گولڈ منیمل واچ", shortDescription: "سفید ڈائل، روز گولڈ کیس اور نرم ٹوپ لیدر اسٹریپ کے ساتھ پتلی 38 ملی میٹر گھڑی۔" },
      hi: { name: "रोज़ गोल्ड मिनिमल वॉच", shortDescription: "सफ़ेद डायल, रोज़-गोल्ड केस और मुलायम टॉप लेदर स्ट्रैप वाली पतली 38 mm घड़ी।" },
    },
  },
  {
    slug: "full-grain-leather-belt",
    sku: "4B-A-BLT",
    category: "fashion-accessories",
    gender: "MEN",
    name: "Full-Grain Leather Belt",
    shortDescription: "A 38 mm full-grain leather belt with a brushed-steel roller buckle, made to last for years.",
    description:
      "Cut from a single strip of thick full-grain leather with burnished, hand-finished edges.\n\nA solid brushed-steel roller buckle, a matching keeper and five adjustment holes. Wears in beautifully with jeans and chinos.\n\nWidth 38 mm. Sizes are waist sizes in inches — choose your trouser waist size.",
    material: "Full-grain cow leather; brushed stainless-steel buckle",
    price: "4990",
    colours: [
      { color: "Dark Brown", colorHex: "#4A3424", code: "DBR", sizes: ["32", "34", "36", "38"], stock: [4, 6, 6, 4] },
      { color: "Black", colorHex: "#0B0B0A", code: "BLK", sizes: ["32", "34", "36", "38"], stock: [4, 6, 6, 4] },
    ],
    images: ["Dark brown full-grain leather belt with steel buckle", "Black full-grain leather belt with brown edges"],
    translations: {
      ur: { name: "فُل گرین لیدر بیلٹ", shortDescription: "برشڈ اسٹیل بکل کے ساتھ 38 ملی میٹر فُل گرین لیدر بیلٹ، برسوں چلنے کے لیے۔" },
      hi: { name: "फ़ुल-ग्रेन लेदर बेल्ट", shortDescription: "ब्रश्ड-स्टील बकल के साथ 38 mm फ़ुल-ग्रेन लेदर बेल्ट, सालों चलने के लिए।" },
    },
  },
];

/** Department → subcategory slugs this catalogue needs (matches prisma/seed.mjs). */
export const CATEGORY_TREE = {
  men: { name: "Men", children: { "men-shirts": "Shirts", "men-hoodies": "Hoodies", "men-jackets": "Jackets", "men-trousers": "Trousers", "men-t-shirts": "T-Shirts" } },
  women: { name: "Women", children: { "women-dresses": "Dresses", "women-jackets": "Jackets", "women-pants": "Pants", "women-tops": "Tops", "women-shirts": "Shirts" } },
  kids: { name: "Kids", children: { "kids-hoodies": "Hoodies", "kids-shirts": "Shirts", "kids-t-shirts": "T-Shirts", "kids-pants": "Pants", "kids-tracksuits": "Tracksuits" } },
  accessories: { name: "Accessories", children: { bags: "Bags", handbags: "Hand Bags", perfumes: "Perfumes", watches: "Watches", "fashion-accessories": "Fashion Accessories" } },
};
