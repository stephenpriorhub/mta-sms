import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isAuthorizedHubUser, forbidden } from "@/lib/hub-auth";
import { normalizeSlug, isValidSlug } from "@/lib/slug";
import { sanitizePostCategories } from "@/lib/categories";
import { uniqueViewsByList } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorizedHubUser(await getHubUser(req))) return forbidden();
  const lists = await prisma.list.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        // Post count must exclude soft-deleted posts (they live in the bin).
        select: { posts: { where: { deletedAt: null } }, pageViews: true },
      },
    },
  });
  // Attach unique (distinct-visitor) view counts alongside the total pageViews.
  const uniqueByList = await uniqueViewsByList();
  const withUnique = lists.map((l) => ({
    ...l,
    uniqueViews: uniqueByList.get(l.id) ?? 0,
  }));
  return NextResponse.json({ lists: withUnique });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedHubUser(await getHubUser(req))) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const slug = normalizeSlug(body.slug || "");
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "slug must be exactly 5 lowercase letters or numbers" },
      { status: 400 }
    );
  }
  const exists = await prisma.list.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "slug already in use" }, { status: 409 });
  }
  const list = await prisma.list.create({
    data: {
      name: body.name,
      slug,
      logoUrl: body.logoUrl || null,
      postCategories: sanitizePostCategories(body.postCategories),
      archivesEnabled: !!body.archivesEnabled,
    },
  });
  return NextResponse.json({ list }, { status: 201 });
}
