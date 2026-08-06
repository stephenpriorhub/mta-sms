import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isAuthorizedHubUser, forbidden } from "@/lib/hub-auth";
import { syncEditorialToMtarix, editorialCodeForList } from "@/lib/mtarix";

export const dynamic = "force-dynamic";
// A backfill can touch many posts; give it room beyond the default.
export const maxDuration = 300;

const DEFAULT_SINCE = "2026-08-01";

/**
 * One-off (idempotent) backfill: push ALREADY-published T-Letters to MTARIX for
 * posts that predate the live publish hook and were therefore never sent.
 *
 * POST /api/admin/mtarix-backfill?since=YYYY-MM-DD
 *
 * Selects posts that are published NOW (publishDate in [since, now], not
 * soft-deleted) whose parent list is active and MAPPED to a MTARIX code
 * (unmapped lists are skipped — see lib/mtarix.ts). Each post is synced via the
 * same `syncEditorialToMtarix` used on publish, which is idempotent by
 * sourceId `mta-sms:<postId>` on the MTARIX side, so re-running is safe.
 *
 * Fail-soft per post: one failure never aborts the batch. Auth is the standard
 * admin gate (hub session cookie OR x-hub-token service identity), so it can be
 * triggered against production with the shared hub token.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedHubUser(await getHubUser(req))) return forbidden();

  const sinceParam =
    new URL(req.url).searchParams.get("since")?.trim() || DEFAULT_SINCE;
  const since = new Date(`${sinceParam}T00:00:00.000Z`);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json(
      { error: `Invalid ?since date: "${sinceParam}" (want YYYY-MM-DD)` },
      { status: 400 }
    );
  }
  const now = new Date();

  // Only lists that map to a MTARIX code — skip unmapped entirely at the query
  // layer so we never even attempt mis-coded editorial.
  const activeLists = await prisma.list.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  const mappedLists = activeLists.filter(
    (l) => editorialCodeForList(l.name) !== null
  );
  const mappedListIds = mappedLists.map((l) => l.id);

  const posts = mappedListIds.length
    ? await prisma.post.findMany({
        where: {
          listId: { in: mappedListIds },
          deletedAt: null,
          publishDate: { gte: since, lte: now },
        },
        orderBy: { publishDate: "asc" },
        include: { list: { select: { name: true, slug: true } } },
      })
    : [];

  let synced = 0;
  let failed = 0;
  const results: Array<{
    postId: string;
    title: string;
    list: string;
    publishDate: string;
    ok: boolean;
    skipped?: string;
    status?: number;
  }> = [];

  // Sequential to stay gentle on MTARIX; batches here are small.
  for (const post of posts) {
    const r = await syncEditorialToMtarix(post, post.list);
    if (r.ok) synced++;
    else failed++;
    results.push({
      postId: post.id,
      title: post.title || "Untitled",
      list: post.list.name,
      publishDate: post.publishDate.toISOString().slice(0, 10),
      ok: r.ok,
      skipped: r.skipped,
      status: r.status,
    });
  }

  return NextResponse.json({
    since: sinceParam,
    now: now.toISOString(),
    mappedLists: mappedLists.map((l) => ({
      name: l.name,
      code: editorialCodeForList(l.name),
    })),
    found: posts.length,
    synced,
    failed,
    results,
  });
}
