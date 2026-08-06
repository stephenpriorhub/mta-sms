// MTARIX editorial sync.
//
// When a T-Letter post is PUBLISHED on this site (publishDate is now-or-past and
// the post is not soft-deleted), we push it to the MTARIX editorial app so an
// editorial "issue" is created/updated. MTARIX is idempotent by `sourceId`, so
// re-publishing the same post updates the same editorial (no duplicates).
//
// STRICTLY FAIL-SOFT: this must NEVER block or fail a publish. Every call is
// wrapped in try/catch with a short timeout; a MTARIX outage is swallowed and
// logged only. Call it from Next `after()` so it runs off the response path.

import { publicPostUrl } from "@/lib/site";

const MTARIX_ENDPOINT =
  process.env.MTARIX_EDITORIAL_URL ??
  "https://mtarix.oxfordhub.app/api/editorial/from-tletter";

// How a T-Letter list maps to a MTARIX editorial `code`. Keyed by the list's
// normalized name (lowercased, whitespace-collapsed). Lists with NO mapping are
// skipped so we never create mis-coded editorial. Matt McCall's T-Letter has no
// list yet, so it intentionally has no entry.
const CODE_BY_LIST_NAME: Record<string, string> = {
  "trade of the day wake up watchlist": "TDWATCH",
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Resolve the MTARIX editorial code for a list, or null when unmapped. */
export function editorialCodeForList(listName: string): string | null {
  return CODE_BY_LIST_NAME[normalizeName(listName)] ?? null;
}

interface PostLike {
  id: string;
  title: string | null;
  publishDate: Date;
  deletedAt: Date | null;
}
interface ListLike {
  name: string;
  slug: string;
}

/** True when the post is publicly published right now (visible on the site). */
export function isPublished(post: PostLike): boolean {
  return post.deletedAt == null && post.publishDate.getTime() <= Date.now();
}

/**
 * Push a published post to MTARIX. Fully fail-soft: resolves to a small status
 * object and NEVER throws. Skips silently when the post isn't published, the list
 * is unmapped, or the shared hub token isn't configured.
 */
export async function syncEditorialToMtarix(
  post: PostLike,
  list: ListLike
): Promise<{ ok: boolean; skipped?: string; status?: number }> {
  try {
    if (!isPublished(post)) return { ok: false, skipped: "not-published" };

    const code = editorialCodeForList(list.name);
    if (!code) return { ok: false, skipped: "unmapped-list" };

    const token = process.env.HUB_API_TOKEN;
    if (!token) return { ok: false, skipped: "no-token" };

    // publishDate as YYYY-MM-DD (UTC).
    const publishDate = post.publishDate.toISOString().slice(0, 10);

    const payload = {
      sourceId: `mta-sms:${post.id}`,
      title: post.title || "Untitled",
      publishDate,
      code,
      url: publicPostUrl(list.slug, post.id),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(MTARIX_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-token": token,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(
          `[mtarix] editorial sync HTTP ${res.status} for ${payload.sourceId}`
        );
        return { ok: false, status: res.status };
      }
      return { ok: true, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Swallow everything — publishing must never be blocked by MTARIX.
    console.error("[mtarix] editorial sync failed (ignored):", err);
    return { ok: false, skipped: "error" };
  }
}
