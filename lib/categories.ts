// Helpers for the per-list managed set of POST categories (internal only).

/**
 * Coerce arbitrary input into a clean list of post-category names:
 * trimmed, non-empty, de-duplicated (case-insensitive), and capped so the admin
 * can't create an unbounded set. Returns [] for anything that isn't an array.
 */
export function sanitizePostCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const name = raw.trim().slice(0, 60);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * Resolve a submitted post category against the parent list's allowed set.
 * Returns the matching category name (preserving the list's canonical casing),
 * or null if empty/blank or not in the list. Keeps Post.category consistent.
 */
export function resolvePostCategory(
  input: unknown,
  allowed: string[]
): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (!name) return null;
  const match = allowed.find((c) => c.toLowerCase() === name.toLowerCase());
  return match ?? null;
}
