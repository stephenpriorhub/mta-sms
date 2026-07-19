import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// First-party link-click tracker + redirect. This is the more robust choice for
// mobile (survives navigation, works without JS, not blocked like beacons).
// /r/<postId>?u=<encoded absolute url>&label=<optional>
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("u") || "";
  const label = searchParams.get("label") || null;

  // Only redirect to absolute http(s) URLs — never an open relative/js redirect.
  let dest: URL | null = null;
  try {
    const parsed = new URL(target);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      dest = parsed;
    }
  } catch {
    dest = null;
  }
  if (!dest) {
    return new NextResponse("Invalid link", { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, listId: true },
    });
    if (post) {
      await prisma.linkClick.create({
        data: {
          postId: post.id,
          listId: post.listId,
          url: dest.toString(),
          label,
        },
      });
    }
  } catch {
    // never block the redirect on a tracking failure
  }

  return NextResponse.redirect(dest.toString(), 302);
}
