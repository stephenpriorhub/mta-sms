// LOCKED DECISION: every list slug is EXACTLY 5 characters, lowercase
// alphanumeric, required + unique. Public list pages resolve at /[5-char-slug].

export const SLUG_LEN = 5;
export const SLUG_RE = /^[a-z0-9]{5}$/;

/** True if the slug is exactly 5 lowercase-alphanumeric characters. */
export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/**
 * Coerce arbitrary input toward a valid slug (lowercase, strip non-alnum, take
 * the first 5 chars). Does NOT pad — a result shorter than 5 chars is invalid
 * and must be rejected by isValidSlug at the call site.
 */
export function normalizeSlug(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, SLUG_LEN);
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous 0/o/1/l

/** Generate a random valid 5-char slug (admin "generate" convenience). */
export function randomSlug(): string {
  let out = "";
  for (let i = 0; i < SLUG_LEN; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
