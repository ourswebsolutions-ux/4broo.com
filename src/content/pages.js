// Information pages. Wording lives in the dictionaries (`pages.<slug>`), so every
// page exists in English, Urdu and Hindi. Content is factual: it describes how the
// store actually works (payment methods, delivery-fee configuration, data handling)
// and never invents business terms (no return windows, delivery times or size charts).

export const infoPages = {
  about: { group: "company" },
  contact: { group: "help", contact: true },
  shipping: { group: "help", usesFee: true },
  returns: { group: "help", contact: true },
  exchange: { group: "help", contact: true },
  "size-guide": { group: "help" },
  faqs: { group: "help", usesFee: true, contact: true },
  "privacy-policy": { group: "legal", contact: true },
  terms: { group: "legal", usesFee: true },
};

export const INFO_PAGE_SLUGS = Object.keys(infoPages);
