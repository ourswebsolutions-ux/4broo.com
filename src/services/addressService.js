// Customer address book. Every function takes the authenticated userId from the
// server session and scopes every query by it — a customer can never read or
// change another customer's address, even with a guessed id.
import "server-only";
import { getDb, withTransaction } from "../lib/db.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import { validate } from "../lib/validation/index.js";
import { addressInputSchema } from "../lib/validation/schemas/commerce.js";
import { idSchema } from "../lib/validation/schemas/common.js";

export const MAX_ADDRESSES = 10;

const SELECT = { id: true, label: true, fullName: true, phone: true, addressLine: true, city: true, postalCode: true, country: true, isDefault: true };

export async function listAddresses(userId) {
  return getDb().address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: SELECT });
}

export async function getDefaultAddress(userId) {
  return getDb().address.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: SELECT });
}

/** The first address becomes the default automatically; exactly one default otherwise. */
export async function createAddress(userId, input) {
  const data = validate(addressInputSchema, input);
  return withTransaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) throw new ConflictError(`You can save up to ${MAX_ADDRESSES} addresses.`).localized("address.limit", { count: MAX_ADDRESSES });
    const isDefault = data.isDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, isDefault, userId }, select: SELECT });
  });
}

export async function updateAddress(userId, addressId, input) {
  const id = validate(idSchema, addressId);
  const data = validate(addressInputSchema, input);
  return withTransaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } });
    if (!existing) throw new NotFoundError("Address not found.").localized("errors.notFound");
    // The default can be moved, never removed by unticking (there must stay one default).
    const isDefault = existing.isDefault || data.isDefault;
    if (isDefault && !existing.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { ...data, isDefault }, select: SELECT });
  });
}

export async function setDefaultAddress(userId, addressId) {
  const id = validate(idSchema, addressId);
  return withTransaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) throw new NotFoundError("Address not found.").localized("errors.notFound");
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
}

/** Deleting the default promotes the oldest remaining address. */
export async function deleteAddress(userId, addressId) {
  const id = validate(idSchema, addressId);
  return withTransaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } });
    if (!existing) throw new NotFoundError("Address not found.").localized("errors.notFound");
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}
