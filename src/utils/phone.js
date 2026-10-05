/**
 * International phone digits (country code, no "+", e.g. 923001234567) or null when invalid.
 * Pakistani local numbers (03001234567) and 00-prefixed numbers are converted.
 */
export function toPhoneDigits(number) {
  let digits = String(number ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return digits;
}
