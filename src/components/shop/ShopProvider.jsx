"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addToCartAction,
  moveSavedToCartAction,
  removeCartItemAction,
  removeSavedItemAction,
  saveForLaterAction,
  setWishlistAction,
  updateCartQuantityAction,
  wishlistToCartAction,
} from "@/actions/shop";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { CartDrawer } from "./CartDrawer";
import { LoginPrompt } from "./LoginPrompt";

const INTENT_KEY = "4bro:intent";
const INTENT_TTL_MS = 30 * 60 * 1000;

const EMPTY = { status: "loading", signedIn: false, user: null, cart: { items: [], count: 0, subtotal: null, savings: null, hasIssues: false }, saved: [], wishlist: [] };

const ShopContext = createContext(null);

/** Current shop state for this browser session (guest → empty state). */
async function fetchShop(locale) {
  const response = await fetch(`/api/shop?locale=${locale}`, { cache: "no-store", credentials: "same-origin" });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error?.message ?? "Shop state unavailable");
  return payload.data;
}

/** Remember what a guest tried to do, so it can be completed after sign-in. */
function storeIntent(intent) {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    /* storage unavailable — the guest simply repeats the action after signing in */
  }
}

function takeIntent() {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    sessionStorage.removeItem(INTENT_KEY);
    const intent = raw ? JSON.parse(raw) : null;
    return intent && Date.now() - intent.at < INTENT_TTL_MS ? intent : null;
  } catch {
    return null;
  }
}

/**
 * Client-side shop state for the signed-in customer: cart, saved items and
 * wishlist ids, loaded from /api/shop (pages themselves stay statically cached).
 * Every mutation is a Server Action that returns the fresh server-computed state.
 * Guests get a sign-in prompt; their action is replayed after they sign in.
 */
export function ShopProvider({ children }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [state, setState] = useState(EMPTY);
  const [pending, setPending] = useState(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [wishOverrides, setWishOverrides] = useState({});
  const resumed = useRef(false);

  const apply = useCallback((data) => {
    setState((previous) => ({ ...previous, ...data, status: "ready", signedIn: previous.signedIn || Boolean(data.user) }));
    setWishOverrides({});
  }, []);

  /** Run a Server Action with a pending key; returns true on success. */
  const run = useCallback(
    async (key, action, successMessage) => {
      setPending((set) => new Set(set).add(key));
      try {
        const result = await action();
        if (result?.ok) {
          apply(result.data);
          if (successMessage) toast.success(successMessage);
          return true;
        }
        toast.error(result?.message ?? t("errors.generic"));
        return false;
      } catch {
        toast.error(t("errors.generic"));
        return false;
      } finally {
        setPending((set) => {
          const next = new Set(set);
          next.delete(key);
          return next;
        });
      }
    },
    [apply, toast, t],
  );

  const actions = useMemo(() => {
    const addToCart = async (variantId, quantity = 1, { openDrawer = true } = {}) => {
      const ok = await run(`add:${variantId}`, () => addToCartAction({ variantId, quantity, locale }), openDrawer ? null : t("cart.added"));
      if (ok && openDrawer) setDrawerOpen(true);
      return ok;
    };
    const setFavorite = async (productId, active) => {
      setWishOverrides((map) => ({ ...map, [productId]: active })); // optimistic
      const ok = await run(`wish:${productId}`, () => setWishlistAction({ productId, active, locale }), t(active ? "wishlist.added" : "wishlist.removed"));
      if (!ok) setWishOverrides((map) => ({ ...map, [productId]: !active }));
      return ok;
    };
    return {
      addToCart,
      setFavorite,
      updateQuantity: (itemId, quantity) => run(`qty:${itemId}`, () => updateCartQuantityAction({ itemId, quantity, locale })),
      removeItem: (itemId) => run(`remove:${itemId}`, () => removeCartItemAction({ itemId, locale }), t("cart.removed")),
      saveForLater: (itemId) => run(`save:${itemId}`, () => saveForLaterAction({ itemId, locale }), t("cart.movedToSaved")),
      moveSavedToCart: (savedItemId) => run(`unsave:${savedItemId}`, () => moveSavedToCartAction({ savedItemId, locale }), t("saved.movedToCart")),
      removeSaved: (savedItemId) => run(`unsave-remove:${savedItemId}`, () => removeSavedItemAction({ savedItemId, locale }), t("saved.removed")),
      wishlistToCart: (productId) => run(`wish-cart:${productId}`, () => wishlistToCartAction({ productId, locale }), t("cart.added")),
    };
  }, [run, locale, t]);

  const receive = useCallback(
    (data) => {
      apply(data);
      setState((previous) => ({ ...previous, signedIn: data.signedIn }));
    },
    [apply],
  );
  const fail = useCallback(() => setState((previous) => ({ ...previous, status: "error" })), []);

  const load = useCallback(() => fetchShop(locale).then(receive, fail), [locale, receive, fail]);

  // Initial load (and reload when the language changes, for localised names),
  // then complete an action a guest started before signing in.
  useEffect(() => {
    let cancelled = false;
    fetchShop(locale).then(
      async (data) => {
        if (cancelled) return;
        receive(data);
        if (resumed.current || !data.user) return;
        const intent = takeIntent();
        if (!intent) return;
        resumed.current = true;
        if (intent.type === "cart") await actions.addToCart(intent.variantId, intent.quantity ?? 1);
        if (intent.type === "wishlist") await actions.setFavorite(intent.productId, true);
      },
      () => !cancelled && fail(),
    );
    return () => {
      cancelled = true;
    };
  }, [locale, receive, fail, actions]);

  // Refresh when the tab regains focus (bag changed on another device / tab).
  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  /** Guests: explain, remember the intent, offer sign-in / registration. Admins: explain only. */
  const guard = useCallback(
    (intent) => {
      if (state.user) return true;
      if (state.signedIn) {
        toast.error(t("errors.customerOnly"));
        return false;
      }
      storeIntent(intent);
      setPrompt(intent.type);
      return false;
    },
    [state.user, state.signedIn, toast, t],
  );

  const value = useMemo(() => {
    const wishlist = new Set(state.wishlist);
    for (const [productId, active] of Object.entries(wishOverrides)) active ? wishlist.add(productId) : wishlist.delete(productId);
    return {
      ...state,
      wishlist,
      isPending: (key) => pending.has(key),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      reload: load,
      addToCart: (variantId, quantity, options) => guard({ type: "cart", variantId, quantity }) && actions.addToCart(variantId, quantity, options),
      toggleFavorite: (productId) => guard({ type: "wishlist", productId }) && actions.setFavorite(productId, !wishlist.has(productId)),
      updateQuantity: actions.updateQuantity,
      removeItem: actions.removeItem,
      saveForLater: actions.saveForLater,
      moveSavedToCart: actions.moveSavedToCart,
      removeSaved: actions.removeSaved,
      wishlistToCart: actions.wishlistToCart,
    };
  }, [state, wishOverrides, pending, drawerOpen, load, guard, actions]);

  return (
    <ShopContext.Provider value={value}>
      {children}
      <CartDrawer />
      <LoginPrompt kind={prompt} onClose={() => setPrompt(null)} />
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used inside <ShopProvider>");
  return context;
}
