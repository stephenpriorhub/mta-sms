import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isAuthorizedHubUser, forbidden } from "@/lib/hub-auth";
import {
  uniqueViewsByList,
  uniqueViewsForList,
  uniqueViewsByPost,
  linkStats,
  uniqueClickersByPost,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Analytics summary. Optional ?listId=<id> to scope to one list (with per-post
// views and per-link click breakdown). Without it, returns per-list totals.
export async function GET(req: NextRequest) {
  if (!isAuthorizedHubUser(await getHubUser(req))) return forbidden();
  const listId = new URL(req.url).searchParams.get("listId");

  if (!listId) {
    // Per-list totals across all lists.
    const lists = await prisma.list.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
            pageViews: true,
            linkClicks: true,
          },
        },
      },
    });
    const uniqueByList = await uniqueViewsByList();
    return NextResponse.json({
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        posts: l._count.posts,
        views: l._count.pageViews,
        uniqueViews: uniqueByList.get(l.id) ?? 0,
        clicks: l._count.linkClicks,
      })),
    });
  }

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [
    totalViews,
    totalUniqueViews,
    totalClicks,
    posts,
    viewsByPost,
    uniqueByPost,
    linksByPost,
    clickersByPost,
  ] = await Promise.all([
    prisma.pageView.count({ where: { listId } }),
    uniqueViewsForList(listId),
    prisma.linkClick.count({ where: { listId } }),
    prisma.post.findMany({
      where: { listId, deletedAt: null },
      orderBy: { publishDate: "desc" },
      select: { id: true, title: true, publishDate: true },
    }),
    prisma.pageView.groupBy({
      by: ["postId"],
      where: { listId, postId: { not: null } },
      _count: { _all: true },
    }),
    uniqueViewsByPost(listId),
    linkStats({ listId }),
    uniqueClickersByPost({ listId }),
  ]);

  const viewMap = new Map(
    viewsByPost.map((v) => [v.postId, v._count._all])
  );

  return NextResponse.json({
    list: { id: list.id, name: list.name, slug: list.slug },
    totals: {
      views: totalViews,
      uniqueViews: totalUniqueViews,
      clicks: totalClicks,
    },
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      publishDate: p.publishDate,
      views: viewMap.get(p.id) ?? 0,
      uniqueViews: uniqueByPost.get(p.id) ?? 0,
      uniqueClickers: clickersByPost.get(p.id) ?? 0,
      links: linksByPost.get(p.id) ?? [],
    })),
  });
}
