import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { resolvePostCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }
  const list = await prisma.list.findFirst({
    where: { id: body.listId, deletedAt: null },
  });
  if (!list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }
  const post = await prisma.post.create({
    data: {
      listId: body.listId,
      title: body.title || null,
      category: resolvePostCategory(body.category, list.postCategories),
      publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
      content: body.content || "",
      topAdEnabled: !!body.topAdEnabled,
      topAdText: body.topAdText || null,
      topAdLink: body.topAdLink || null,
      actionToTake: body.actionToTake || null,
      actionSecondary: body.actionSecondary || null,
      buttonText: body.buttonText || null,
      buttonUrl: body.buttonUrl || null,
    },
  });
  return NextResponse.json({ post }, { status: 201 });
}
