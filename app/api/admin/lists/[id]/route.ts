import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { normalizeSlug, isValidSlug } from "@/lib/slug";
import { sanitizePostCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      // Exclude soft-deleted posts from the manage view — they live in the bin.
      posts: { where: { deletedAt: null }, orderBy: { publishDate: "desc" } },
    },
  });
  if (!list) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ list });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.slug === "string") {
    const slug = normalizeSlug(body.slug);
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "slug must be exactly 5 lowercase letters or numbers" },
        { status: 400 }
      );
    }
    const clash = await prisma.list.findFirst({
      where: { slug, NOT: { id } },
    });
    if (clash)
      return NextResponse.json({ error: "slug already in use" }, { status: 409 });
    data.slug = slug;
  }
  if ("logoUrl" in body) data.logoUrl = body.logoUrl || null;
  if ("postCategories" in body)
    data.postCategories = sanitizePostCategories(body.postCategories);
  if ("archivesEnabled" in body) data.archivesEnabled = !!body.archivesEnabled;

  const list = await prisma.list.update({ where: { id }, data });
  return NextResponse.json({ list });
}

// SOFT-DELETE only. Moves the list to the Recycle Bin (sets deletedAt). This is
// the most destructive action (a hard delete would cascade to every post), so we
// deliberately do NOT touch the posts here: they stay as-is and are hidden simply
// because their parent list is hidden. On restore, the list's posts reappear
// (except any individually soft-deleted). A real hard delete (cascading to posts)
// happens ONLY via the trash purge endpoint (app/api/admin/trash/lists/[id] DELETE).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  await prisma.list.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
