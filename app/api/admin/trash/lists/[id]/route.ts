import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";

export const dynamic = "force-dynamic";

// RESTORE a soft-deleted list (deletedAt -> null). Its posts reappear along with
// it — EXCEPT any that were individually soft-deleted (those keep their own
// deletedAt and remain in the bin).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  const existing = await prisma.list.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.list.update({ where: { id }, data: { deletedAt: null } });
  return NextResponse.json({ ok: true });
}

// PERMANENT hard delete — the ONLY place a list row is actually removed. This
// CASCADES to every post in the list (Prisma onDelete: Cascade), so the admin UI
// requires explicit type-to-confirm before calling this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();
  const { id } = await params;
  await prisma.list.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
