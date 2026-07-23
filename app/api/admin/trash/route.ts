import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

// Recycle Bin contents: everything currently soft-deleted (deletedAt != null),
// most-recently-deleted first. Powers the /admin/trash page.
export async function GET(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();

  const [posts, lists] = await Promise.all([
    // Individually soft-deleted posts, with their parent list's name/slug so the
    // admin can see where each one came from (even if that list is itself deleted).
    prisma.post.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        listId: true,
        list: { select: { name: true, slug: true, deletedAt: true } },
      },
    }),
    // Soft-deleted lists. Post count reflects the posts that would reappear on
    // restore (i.e. those NOT individually soft-deleted).
    prisma.list.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
        _count: { select: { posts: { where: { deletedAt: null } } } },
      },
    }),
  ]);

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title,
      deletedAt: p.deletedAt,
      listId: p.listId,
      listName: p.list.name,
      listSlug: p.list.slug,
      listDeleted: p.list.deletedAt != null,
    })),
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      deletedAt: l.deletedAt,
      posts: l._count.posts,
    })),
  });
}
