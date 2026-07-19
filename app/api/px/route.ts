import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse() {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Length": String(PIXEL.length),
    },
  });
}

// First-party page-view tracker. ?l=<listId>&p=<postId?>. Always returns the
// pixel even if recording fails — tracking must never break the page.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("l");
  const postId = searchParams.get("p");
  if (listId) {
    try {
      await prisma.pageView.create({
        data: { listId, postId: postId || null },
      });
    } catch {
      // swallow — never fail a tracking request
    }
  }
  return pixelResponse();
}
