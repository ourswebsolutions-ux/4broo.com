import { z } from "zod";
import { emailSchema, personNameSchema, phoneSchema, safeRedirectSchema } from "./common.js";

export const PASSWORD_MIN_LENGTH = 10;

export const newPasswordSchema = z
  .string({ error: "Password is required." })
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` })
  .max(128, { error: "Use 128 characters or fewer." })
  .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
  .regex(/[0-9]/, { error: "Include at least one number." });

export const registerSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string({ error: "Please confirm your password." }),
    redirectTo: safeRedirectSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  // No strength rules on login — only bound the size to protect the hasher.
  password: z.string({ error: "Password is required." }).min(1, { error: "Password is required." }).max(128),
  redirectTo: safeRedirectSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(128),
    password: newPasswordSchema,
    confirmPassword: z.string({ error: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], error: "Passwords do not match." });

export const profileSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), phoneSchema.nullable()),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"], error: "Passwords do not match." });
