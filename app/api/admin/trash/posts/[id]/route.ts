import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

// RESTORE a soft-deleted post (deletedAt -> null). If the parent list is itself
// still soft-deleted the post is restored but stays hidden publicly until the
// list is restored too — we surface that state so the UI can warn.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  const existing = await prisma.post.findUnique({
    where: { id },
    select: { id: true, list: { select: { deletedAt: true } } },
  });
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.post.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({
    ok: true,
    listStillDeleted: existing.list.deletedAt != null,
  });
}

// PERMANENT hard delete — the ONLY place a post row is actually removed. The
// admin UI requires explicit confirmation before calling this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
