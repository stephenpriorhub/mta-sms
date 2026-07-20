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
      posts: { orderBy: { publishDate: "desc" } },
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  await prisma.list.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
