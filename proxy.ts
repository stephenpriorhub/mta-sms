/**
 * Next.js 16 middleware (file is `proxy.ts`, not `middleware.ts`).
 *
 * Only the ADMIN API is walled: every /api/admin/* request must come from a
 * signed-in, authorized OxfordHub user (session cookie verified against the hub)
 * or a maintenance script (x-hub-token). Everything else is public by design:
 *   - the public T-Letter pages (/[list])
 *   - the tracking pixel (/api/px) and link redirect (/r/*)
 *   - image serving (/api/img/*) and health (/api/health)
 *
 * The /admin *pages* themselves are gated client-side by hub-nav.js (which keeps
 * the page hidden until it confirms auth and shows a lockout otherwise); the
 * server-side wall here protects the data.
 */
import { NextRequest, NextResponse } from "next/server";

const PROJECT_ID = process.env.NEXT_PUBLIC_HUB_PROJECT_ID ?? "mta-sms";
const HUB_ME_URL =
  (process.env.HUB_URL ?? "https://oxfordhub.app") +
  `/api/me?projectId=${encodeURIComponent(PROJECT_ID)}`;

export const config = {
  matcher: "/api/admin/:path*",
};

export default async function proxy(req: NextRequest) {
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
