"use server";

// Cart, save-for-later and wishlist Server Actions.
// Each one runs through runCustomerAction (session identity + CUSTOMER role),
// validates its input in the service layer and returns the fresh, server-computed
// shop state — prices and totals never come from the browser.
import { getShopState } from "@/data/shop";
import { runCustomerAction } from "@/lib/actions";
import {
  addToCart,
  moveCartItemToSaved,
  moveSavedItemToCart,
  removeCartItem,
  removeSavedItem,
  updateCartItemQuantity,
} from "@/services/cartService";
import { addToWishlist, getQuickAddVariantId, removeFromWishlist } from "@/services/wishlistService";

const withState = (name, locale, task) =>
  runCustomerAction(name, locale, async (user, t) => {
    await task(user, t);
    return getShopState(user, { locale });
  });

export async function addToCartAction({ variantId, quantity = 1, locale }) {
  return withState("add to cart", locale, (user) => addToCart(user.id, { variantId, quantity }));
}

export async function updateCartQuantityAction({ itemId, quantity, locale }) {
  return withState("update cart quantity", locale, (user) => updateCartItemQuantity(user.id, { itemId, quantity }));
}

export async function removeCartItemAction({ itemId, locale }) {
  return withState("remove cart item", locale, (user) => removeCartItem(user.id, itemId));
}

export async function saveForLaterAction({ itemId, locale }) {
  return withState("save for later", locale, (user) => moveCartItemToSaved(user.id, itemId));
}

export async function moveSavedToCartAction({ savedItemId, locale }) {
  return withState("move saved to cart", locale, (user) => moveSavedItemToCart(user.id, savedItemId));
}

export async function removeSavedItemAction({ savedItemId, locale }) {
  return withState("remove saved item", locale, (user) => removeSavedItem(user.id, savedItemId));
}

/** Idempotent favourite toggle: `active` is the desired state, not a flip. */
export async function setWishlistAction({ productId, active, locale }) {
  return withState("wishlist", locale, (user) => (active ? addToWishlist(user.id, { productId }) : removeFromWishlist(user.id, { productId })));
}

/** Wishlist → bag for single-variant products (others need a size/colour choice first). */
export async function wishlistToCartAction({ productId, locale }) {
  return withState("wishlist to cart", locale, async (user) => {
    const variantId = await getQuickAddVariantId(productId);
    await addToCart(user.id, { variantId, quantity: 1 });
  });
}
