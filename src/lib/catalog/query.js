// URL ⇄ catalogue filter state. Isomorphic (server pages parse it; client filter UI builds it).
//
//   /collections/men?sub=men-t-shirts&size=M,L&color=black&min=2000&max=6000&stock=in&sort=price-low
//
// Unknown or malformed values are dropped silently, so a hand-edited or stale URL
// can never break a page. Price bounds are entered in the shopper's display currency
// (cur=pkr|usd) and converted to canonical PKR with the central exchange rate.
import { BASE_CURRENCY } from "../../config/currency.js";
import { convertToBase } from "../currency/money.js";

export const SORT_OPTIONS = [
  { value: "featured", param: "featured" },
  { value: "newest", param: "newest" },
  { value: "bestSelling", param: "best-selling" },
  { value: "priceAsc", param: "price-low" },
  { value: "priceDesc", param: "price-high" },
  { value: "name", param: "name" },
];
export const DEFAULT_SORT = "featured";

const GENDERS = ["men", "women", "kids", "unisex"];
const FLAGS = { sale: "onSale", new: "newArrival", best: "bestSeller", featured: "featured" };
const MAX_VALUES = 20;
const TOKEN = /^[\p{L}\p{N}][\p{L}\p{N} .\-/&+%#'()]{0,59}$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

/** Read a param as a list: supports repeated keys and comma-separated values. */
function list(params, key, pattern = TOKEN) {
  const raw = typeof params.getAll === "function" ? params.getAll(key) : [].concat(params[key] ?? []);
  const values = raw.flatMap((value) => String(value).split(",")).map((value) => value.trim()).filter((value) => value && pattern.test(value));
  return [...new Set(values)].slice(0, MAX_VALUES);
}

function single(params, key) {
  const value = typeof params.get === "function" ? params.get(key) : [].concat(params[key] ?? [])[0];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parse URL search params into { state (for the UI, display currency) , filter (for the DB, PKR) }.
 * @param {URLSearchParams | Record<string, string|string[]>} params
 * @param {{ usdRate?: string | null }} options  USD per 1 PKR, from the server's rate service
 */
export function parseCatalogQuery(params, { usdRate = null } = {}) {
  const currency = single(params, "cur").toUpperCase() === "USD" && usdRate ? "USD" : BASE_CURRENCY;

  let min = MONEY.test(single(params, "min")) ? single(params, "min") : "";
  let max = MONEY.test(single(params, "max")) ? single(params, "max") : "";
  if (min && max && Number(max) < Number(min)) [min, max] = [max, min];

  const sortParam = single(params, "sort");
  const sort = SORT_OPTIONS.find((option) => option.param === sortParam)?.value ?? DEFAULT_SORT;
  const pageNumber = Number.parseInt(single(params, "page"), 10);

  const state = {
    q: single(params, "q").slice(0, 80),
    sub: list(params, "sub", SLUG),
    gender: list(params, "gender").map((value) => value.toLowerCase()).filter((value) => GENDERS.includes(value)),
    size: list(params, "size"),
    color: list(params, "color").map((value) => value.toLowerCase()),
    material: list(params, "material"),
    inStock: single(params, "stock") === "in",
    flags: Object.keys(FLAGS).filter((key) => single(params, key) === "1"),
    min,
    max,
    currency,
    sort,
    page: Number.isFinite(pageNumber) && pageNumber > 1 ? Math.min(pageNumber, 1000) : 1,
  };

  const toPkr = (value, mode) => (!value ? undefined : currency === "USD" ? convertToBase(value, usdRate, mode) : value);

  const filter = {
    ...(state.q && { search: state.q }),
    ...(state.sub.length && { subcategories: state.sub }),
    ...(state.gender.length && { gender: state.gender.map((value) => value.toUpperCase()) }),
    ...(state.size.length && { sizes: state.size }),
    ...(state.color.length && { colors: state.color }),
    ...(state.material.length && { materials: state.material }),
    ...(state.inStock && { inStock: true }),
    ...(state.flags.length && { flags: state.flags.map((key) => FLAGS[key]) }),
    ...(min && { priceMin: toPkr(min, "floor") }),
    ...(max && { priceMax: toPkr(max, "ceil") }),
  };

  return { state, filter, sort };
}

/** Number of user-applied filters (for "Filters (3)" labels). */
export function countActiveFilters(state) {
  return state.sub.length + state.gender.length + state.size.length + state.color.length + state.material.length + state.flags.length + (state.inStock ? 1 : 0) + (state.min || state.max ? 1 : 0);
}

/** Serialise state back to a canonical query string (stable order, defaults omitted). */
export function serializeCatalogQuery(state) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  for (const key of ["sub", "gender", "size", "color", "material"]) if (state[key]?.length) params.set(key, state[key].join(","));
  if (state.min) params.set("min", state.min);
  if (state.max) params.set("max", state.max);
  if ((state.min || state.max) && state.currency && state.currency !== BASE_CURRENCY) params.set("cur", state.currency.toLowerCase());
  if (state.inStock) params.set("stock", "in");
  for (const key of state.flags ?? []) params.set(key, "1");
  if (state.sort && state.sort !== DEFAULT_SORT) params.set("sort", SORT_OPTIONS.find((option) => option.value === state.sort)?.param ?? DEFAULT_SORT);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  // Commas are legal in query strings; keep "size=M,L" readable.
  return query ? `?${query.replace(/%2C/gi, ",")}` : "";
}

export const EMPTY_STATE = { q: "", sub: [], gender: [], size: [], color: [], material: [], inStock: false, flags: [], min: "", max: "", currency: BASE_CURRENCY, sort: DEFAULT_SORT, page: 1 };
