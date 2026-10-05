"use server";

// Customer account Server Actions: profile, password and address book.
// Identity always comes from the session (runCustomerAction); ids in the form
// are only ever used together with that session user's id.
import { revalidatePath } from "next/cache";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessionsForUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { runCustomerAction } from "@/lib/actions";
import { formDataToObject, validate } from "@/lib/validation";
import { changePasswordSchema, profileSchema } from "@/lib/validation/schemas/auth";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/services/addressService";

const refreshAccount = () => revalidatePath("/[locale]/account", "layout");

/** Shape for useActionState forms: { ok, message, fieldErrors, values }. */
function formResult(result, successMessage, values) {
  return result.ok ? { ok: true, message: successMessage, at: Date.now() } : { ...result, values };
}

export async function updateProfileAction(_prev, formData) {
  const input = formDataToObject(formData);
  let message;
  const result = await runCustomerAction("update profile", input.locale, async (user, t) => {
    const data = validate(profileSchema, input);
    await getDb().user.update({ where: { id: user.id }, data });
    message = t("account.profileSaved");
    refreshAccount();
  });
  return formResult(result, message, input);
}

export async function changePasswordAction(_prev, formData) {
  const input = formDataToObject(formData);
  let message;
  const result = await runCustomerAction("change password", input.locale, async (user, t) => {
    const data = validate(changePasswordSchema, input);
    const record = await getDb().user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!record || !(await verifyPassword(data.currentPassword, record.passwordHash))) {
      throw new ValidationError(undefined, { currentPassword: ["incorrect"] });
    }
    await getDb().user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } });
    // Sign out every other device, keep this one signed in with a fresh session.
    await destroyAllSessionsForUser(user.id);
    await createSession(user);
    message = t("account.passwordChanged");
  });
  return formResult(result, message, {});
}

const addressFields = (input) => ({
  label: input.label,
  fullName: input.fullName,
  phone: input.phone,
  addressLine: input.addressLine,
  city: input.city,
  postalCode: input.postalCode,
  country: input.country || "Pakistan",
  isDefault: input.isDefault === "on" || input.isDefault === "true",
});

/** Create (no id) or update (id) an address. */
export async function saveAddressAction(_prev, formData) {
  const input = formDataToObject(formData);
  let message;
  const result = await runCustomerAction("save address", input.locale, async (user, t) => {
    if (input.id) await updateAddress(user.id, input.id, addressFields(input));
    else await createAddress(user.id, addressFields(input));
    message = t("address.saved");
    refreshAccount();
  });
  return formResult(result, message, input);
}

export async function deleteAddressAction({ id, locale }) {
  return runCustomerAction("delete address", locale, async (user, t) => {
    await deleteAddress(user.id, id);
    refreshAccount();
    return { message: t("address.deleted") };
  });
}

export async function setDefaultAddressAction({ id, locale }) {
  return runCustomerAction("set default address", locale, async (user, t) => {
    await setDefaultAddress(user.id, id);
    refreshAccount();
    return { message: t("address.defaultSet") };
  });
}
