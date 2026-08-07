import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// Anonymous first-party visitor id cookie. Opaque random value, no PII, no
// fingerprinting. ~1 year, SameSite=Lax, HttpOnly (only the pixel reads it).
const VID_COOKIE = "tl_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

function pixelResponse(setVid?: string) {
  const res = new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Length": String(PIXEL.length),
    },
  });
  if (setVid) {
    res.cookies.set(VID_COOKIE, setVid, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ONE_YEAR,
      path: "/",
    });
  }
  return res;
}

// First-party page-view tracker. ?l=<listId>&p=<postId?>. Always returns the
// pixel even if recording fails — tracking must never break the page.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("l");
  const postId = searchParams.get("p");

  // Read the anonymous visitor id, or mint one to set on this response.
  let visitorId = req.cookies.get(VID_COOKIE)?.value;
  let setVid: string | undefined;
  if (!visitorId) {
    visitorId = randomUUID();
    setVid = visitorId;
  }

  if (listId) {
    try {
      await prisma.pageView.create({
        data: { listId, postId: postId || null, visitorId },
      });
    } catch {
      // swallow — never fail a tracking request
    }
  }
  return pixelResponse(setVid);
}
