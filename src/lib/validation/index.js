// Server-side validation helpers. Every payload from the browser — JSON bodies,
// form submissions, query strings, route params — goes through one of these.
import { ValidationError } from "../errors.js";

/** Flatten Zod issues to { field: [messages] } (form-friendly). */
export function toFieldErrors(zodError) {
  const fieldErrors = {};
  for (const issue of zodError.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Validate data against a schema, throwing a ValidationError on failure. */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(undefined, toFieldErrors(result.error));
  return result.data;
}

/**
 * Non-throwing variant for Server Actions:
 * returns { success: true, data } or { success: false, fieldErrors }.
 */
export function safeValidate(schema, data) {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, fieldErrors: toFieldErrors(result.error) };
}

/** Convert FormData to a plain object (repeated keys become arrays; files are dropped). */
export function formDataToObject(formData) {
  const output = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue; // React/Next internal fields
    if (typeof value !== "string") continue;
    if (key in output) output[key] = [].concat(output[key], value);
    else output[key] = value;
  }
  return output;
}

/** Parse and validate a JSON request body. Malformed JSON is a validation error, not a 500. */
export async function validateJsonBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
  return validate(schema, body);
}

/** Validate URL search params (first value wins for repeated keys). */
export function validateSearchParams(searchParams, schema) {
  return validate(schema, Object.fromEntries(searchParams.entries()));
}
