import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { normalizeSlug, isValidSlug } from "@/lib/slug";
import { sanitizePostCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const lists = await prisma.list.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true, pageViews: true } } },
  });
  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
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
