import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { resolvePostCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ post });
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
  if ("title" in body) data.title = body.title || null;
  if ("category" in body) {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { list: { select: { postCategories: true } } },
    });
    data.category = resolvePostCategory(
      body.category,
      existing?.list.postCategories ?? []
    );
  }
  if ("publishDate" in body && body.publishDate)
    data.publishDate = new Date(body.publishDate);
  if ("content" in body) data.content = body.content || "";
  if ("topAdEnabled" in body) data.topAdEnabled = !!body.topAdEnabled;
  if ("topAdText" in body) data.topAdText = body.topAdText || null;
  if ("topAdLink" in body) data.topAdLink = body.topAdLink || null;
  if ("actionToTake" in body) data.actionToTake = body.actionToTake || null;
  if ("actionSecondary" in body)
    data.actionSecondary = body.actionSecondary || null;
  if ("buttonText" in body) data.buttonText = body.buttonText || null;
  if ("buttonUrl" in body) data.buttonUrl = body.buttonUrl || null;

  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json({ post });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
