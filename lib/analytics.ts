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
