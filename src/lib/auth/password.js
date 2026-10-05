// Password hashing with Node's built-in scrypt (memory-hard, no native dependency).
// Stored format: scrypt$<N>$<r>$<p>$<saltB64>$<hashB64> — parameters are embedded
// so they can be raised later without invalidating existing hashes.
import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEMORY });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, N, r, p, saltB64, hashB64] = String(storedHash).split("$");
  if (algorithm !== "scrypt" || !saltB64 || !hashB64) return false;

  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: MAX_MEMORY,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when a stored hash uses weaker parameters than the current defaults. */
export function passwordNeedsRehash(storedHash) {
  const [algorithm, N, r, p] = String(storedHash).split("$");
  return algorithm !== "scrypt" || Number(N) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p;
}

// Used when an email is unknown so login timing does not reveal which emails are registered.
let dummyHashPromise;
export function getDummyPasswordHash() {
  dummyHashPromise ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHashPromise;
}
