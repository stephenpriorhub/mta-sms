import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const body = await req.json().catch(() => null);
  if (!body?.listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }
  const list = await prisma.list.findUnique({ where: { id: body.listId } });
  if (!list) {
    return NextResponse.json({ error: "list not found" }, { status: 404 });
  }
  const post = await prisma.post.create({
    data: {
      listId: body.listId,
      title: body.title || null,
      publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
      content: body.content || "",
      actionToTake: body.actionToTake || null,
      actionSecondary: body.actionSecondary || null,
      buttonText: body.buttonText || null,
      buttonUrl: body.buttonUrl || null,
    },
  });
  return NextResponse.json({ post }, { status: 201 });
}
