import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

// Analytics summary. Optional ?listId=<id> to scope to one list (with per-post
// views and per-link click breakdown). Without it, returns per-list totals.
export async function GET(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
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
    return NextResponse.json({
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        posts: l._count.posts,
        views: l._count.pageViews,
        clicks: l._count.linkClicks,
      })),
    });
  }

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [totalViews, totalClicks, posts, viewsByPost, clicksByUrl] =
    await Promise.all([
      prisma.pageView.count({ where: { listId } }),
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
      prisma.linkClick.groupBy({
        by: ["postId", "url", "label"],
        where: { listId },
        _count: { _all: true },
      }),
    ]);

  const viewMap = new Map(
    viewsByPost.map((v) => [v.postId, v._count._all])
  );

  return NextResponse.json({
    list: { id: list.id, name: list.name, slug: list.slug },
    totals: { views: totalViews, clicks: totalClicks },
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      publishDate: p.publishDate,
      views: viewMap.get(p.id) ?? 0,
      links: clicksByUrl
        .filter((c) => c.postId === p.id)
        .map((c) => ({ url: c.url, label: c.label, clicks: c._count._all }))
        .sort((a, b) => b.clicks - a.clicks),
    })),
  });
}
