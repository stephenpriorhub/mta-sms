import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isAuthorizedHubUser, forbidden } from "@/lib/hub-auth";
import { resolvePostCategory } from "@/lib/categories";
import { syncEditorialToMtarix } from "@/lib/mtarix";

export const dynamic = "force-dynamic";

// Normalize an optional single stock ticker: uppercase, trimmed, no spaces.
// Empty/absent => null. Kept generous (letters, digits, dot/hyphen for symbols
// like BRK.B) and capped so a stray paste can't bloat the field.
function normalizeTicker(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase().replace(/\s+/g, "").slice(0, 12);
  return t || null;
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedHubUser(await getHubUser(req))) return forbidden();
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
      ticker: normalizeTicker(body.ticker),
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

  // Fire-and-forget MTARIX editorial sync (fail-soft, off the response path).
  after(() => syncEditorialToMtarix(post, list));

  return NextResponse.json({ post }, { status: 201 });
}
