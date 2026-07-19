/**
 * Next.js 16 middleware (file is `proxy.ts`, not `middleware.ts`).
 *
 * Two jobs:
 *
 * 1. CANONICAL HOST — mtasms.com is canonical. Requests to www.mtasms.com are
 *    308-redirected to the apex, preserving path + query
 *    (www.mtasms.com/trade -> mtasms.com/trade). Only the www host is touched:
 *    the temp *.up.railway.app URL, the mta-sms.oxfordhub.app admin host, and
 *    the bare apex are all left alone.
 *
 * 2. ADMIN WALL — every /api/admin/* request must come from a signed-in,
 *    authorized OxfordHub user (session cookie verified against the hub) or a
 *    maintenance script (x-hub-token). Everything else is public by design:
 *      - the public T-Letter pages (/[list])
 *      - the tracking pixel (/api/px) and link redirect (/r/*)
 *      - image serving (/api/img/*) and health (/api/health)
 *
 * The /admin *pages* themselves are gated client-side by hub-nav.js (which keeps
 * the page hidden until it confirms auth and shows a lockout otherwise); the
 * server-side wall here protects the data.
 *
 * The matcher is broad (all paths except Next internals) so the host check can
 * run everywhere, but the hub-auth fetch only fires for /api/admin/* — every
 * other path returns immediately, keeping public/tracking routes fast.
 */
import { NextRequest, NextResponse } from "next/server";

const PROJECT_ID = process.env.NEXT_PUBLIC_HUB_PROJECT_ID ?? "mta-sms";
const HUB_ME_URL =
  (process.env.HUB_URL ?? "https://oxfordhub.app") +
  `/api/me?projectId=${encodeURIComponent(PROJECT_ID)}`;

const CANONICAL_HOST = "mtasms.com";
const WWW_HOST = "www.mtasms.com";

export const config = {
  // Everything except Next static/image internals, so the host check applies to
  // all real requests (public pages, /r, /api/*) without touching build assets.
  matcher: ["/((?!_next/static|_next/image).*)"],
};

export default async function proxy(req: NextRequest) {
  // 1. Canonical host: 308 www.mtasms.com -> mtasms.com (path + query intact).
  const host = req.headers.get("host");
  if (host === WWW_HOST) {
    return NextResponse.redirect(
      `https://${CANONICAL_HOST}${req.nextUrl.pathname}${req.nextUrl.search}`,
      308
    );
  }

  // 2. Only /api/admin/* is walled; every other path is public — return fast.
  if (!req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Maintenance scripts authenticate with the shared service token.
  const token = req.headers.get("x-hub-token");
  if (token && process.env.HUB_API_TOKEN && token === process.env.HUB_API_TOKEN) {
    return NextResponse.next();
  }

  const cookie = req.headers.get("cookie");
  if (cookie) {
    try {
      const res = await fetch(HUB_ME_URL, {
        headers: { cookie },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = (await res.json()) as {
          authenticated?: boolean;
          authorized?: boolean;
        };
        if (d.authenticated && d.authorized) return NextResponse.next();
      }
    } catch {
      // hub unreachable -> fall through to 401 (fail closed)
    }
  }

  return NextResponse.json(
    { error: "Sign in to OxfordHub to manage T-Letter sites." },
    { status: 401 }
  );
}
