import { prisma } from "@/lib/prisma";

// Unique page views = COUNT(DISTINCT visitorId) for a page, with a fallback:
// rows whose visitorId is null (historical rows or no-cookie hits) each count as
// their own individual unique view, so no data is lost. Expressed in SQL as
//   COUNT(DISTINCT visitorId) FILTER (visitorId IS NOT NULL)
//   + COUNT(*)               FILTER (visitorId IS NULL)
// Kept as raw SQL because Prisma has no COUNT(DISTINCT) in groupBy.

// Unique views per list across ALL lists. Map: listId -> unique count.
export async function uniqueViewsByList(): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ listId: string; unique: bigint }[]>`
    SELECT "listId",
      COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
      + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
    FROM "PageView"
    GROUP BY "listId"
  `;
  return new Map(rows.map((r) => [r.listId, Number(r.unique)]));
}

// Total unique views for a single list (all of its pages combined).
export async function uniqueViewsForList(listId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ unique: bigint }[]>`
    SELECT
      COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
      + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
    FROM "PageView"
    WHERE "listId" = ${listId}
  `;
  return rows[0] ? Number(rows[0].unique) : 0;
}

// Unique views per post within a list. Map: postId -> unique count.
export async function uniqueViewsByPost(
  listId: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ postId: string; unique: bigint }[]>`
    SELECT "postId",
      COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
      + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
    FROM "PageView"
    WHERE "listId" = ${listId} AND "postId" IS NOT NULL
    GROUP BY "postId"
  `;
  return new Map(rows.map((r) => [r.postId, Number(r.unique)]));
}

// Total + unique views for a single post's page.
export async function viewCountsForPost(
  postId: string
): Promise<{ views: number; unique: number }> {
  const rows = await prisma.$queryRaw<{ views: bigint; unique: bigint }[]>`
    SELECT COUNT(*) AS "views",
      COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
      + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
    FROM "PageView"
    WHERE "postId" = ${postId}
  `;
  return rows[0]
    ? { views: Number(rows[0].views), unique: Number(rows[0].unique) }
    : { views: 0, unique: 0 };
}

// How a tracked link is reported: the post-level top ad, the "Action to take"
// button, or a link inside the body copy.
export type LinkType = "ad" | "cta" | "content";
export function linkType(label: string | null): LinkType {
  if (label === "top-ad") return "ad";
  if (label === "action-button") return "cta";
  return "content";
}

export interface LinkStat {
  type: LinkType;
  url: string;
  clicks: number;
  unique: number;
}

// Per-link clicks + unique clicks for every post in a list (or one post).
// Same unique rule as page views: distinct visitorId, null rows count singly.
export async function linkStats(
  where: { listId: string } | { postId: string }
): Promise<Map<string, LinkStat[]>> {
  const rows =
    "postId" in where
      ? await prisma.$queryRaw<
          { postId: string; url: string; label: string | null; clicks: bigint; unique: bigint }[]
        >`
          SELECT "postId", "url", "label", COUNT(*) AS "clicks",
            COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
            + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
          FROM "LinkClick" WHERE "postId" = ${where.postId}
          GROUP BY "postId", "url", "label"
        `
      : await prisma.$queryRaw<
          { postId: string; url: string; label: string | null; clicks: bigint; unique: bigint }[]
        >`
          SELECT "postId", "url", "label", COUNT(*) AS "clicks",
            COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
            + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
          FROM "LinkClick" WHERE "listId" = ${where.listId}
          GROUP BY "postId", "url", "label"
        `;
  const out = new Map<string, LinkStat[]>();
  for (const r of rows) {
    const list = out.get(r.postId) ?? [];
    list.push({ type: linkType(r.label), url: r.url, clicks: Number(r.clicks), unique: Number(r.unique) });
    out.set(r.postId, list);
  }
  for (const list of out.values()) list.sort((a, b) => b.unique - a.unique || b.clicks - a.clicks);
  return out;
}

// Distinct visitors who clicked anything on a post (the CTR numerator — a
// visitor clicking two links is one clicker, so this isn't a sum of per-link
// uniques). Map: postId -> unique clickers.
export async function uniqueClickersByPost(
  where: { listId: string } | { postId: string }
): Promise<Map<string, number>> {
  const rows =
    "postId" in where
      ? await prisma.$queryRaw<{ postId: string; unique: bigint }[]>`
          SELECT "postId",
            COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
            + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
          FROM "LinkClick" WHERE "postId" = ${where.postId}
          GROUP BY "postId"
        `
      : await prisma.$queryRaw<{ postId: string; unique: bigint }[]>`
          SELECT "postId",
            COUNT(DISTINCT "visitorId") FILTER (WHERE "visitorId" IS NOT NULL)
            + COUNT(*) FILTER (WHERE "visitorId" IS NULL) AS "unique"
          FROM "LinkClick" WHERE "listId" = ${where.listId}
          GROUP BY "postId"
        `;
  return new Map(rows.map((r) => [r.postId, Number(r.unique)]));
}
