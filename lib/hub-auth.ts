/**
 * OxfordHub SSO for the ADMIN surface only. The public T-Letter pages are open.
 *
 * Mechanism (the standard *.oxfordhub.app pattern): the hub session cookie is
 * scoped to .oxfordhub.app, so the browser sends it to this app. We forward it
 * server-side to the hub's /api/me to resolve {id, email, name, role}.
 * Reference: promo-analyzer lib/hub-auth.ts + memory oxfordhub-server-side-auth.
 *
 * Fail-closed: hub unreachable or cookie invalid => not authorized.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROJECT_ID = process.env.NEXT_PUBLIC_HUB_PROJECT_ID ?? "mta-sms";
const HUB_ME_URL =
  (process.env.HUB_URL ?? "https://oxfordhub.app") +
  `/api/me?projectId=${encodeURIComponent(PROJECT_ID)}`;

export type HubRole = "super_admin" | "exec_admin" | "admin" | "user";

export interface HubUser {
  id: string;
  email: string;
  name: string | null;
  role: HubRole;
}

/** Maintenance / server-to-server identity via shared token. */
function serviceUser(req: NextRequest): HubUser | null {
  const token = req.headers.get("x-hub-token");
  const expected = process.env.HUB_API_TOKEN;
  if (!token || !expected || token !== expected) return null;
  return {
    id: "service",
    email: "service@oxfordhub.app",
    name: "Maintenance Script",
    role: "admin",
  };
}

/** Resolve the requesting user by forwarding their hub session cookie. */
export async function getHubUser(req: NextRequest): Promise<HubUser | null> {
  const svc = serviceUser(req);
  if (svc) return svc;
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  try {
    const res = await fetch(HUB_ME_URL, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated?: boolean;
      authorized?: boolean;
      user?: HubUser;
    };
    return data.authenticated && data.authorized && data.user ? data.user : null;
  } catch {
    return null;
  }
}

/**
 * Admin-tier gate: only the elevated hub roles. Kept for any future surface
 * that must be restricted to hub admins (not currently used by T-Letter admin).
 */
export function isHubAdmin(user: HubUser | null): boolean {
  return (
    !!user &&
    (user.role === "super_admin" ||
      user.role === "exec_admin" ||
      user.role === "admin")
  );
}

/**
 * Authorization gate for the T-Letter admin. A non-null user here means the
 * hub already returned authenticated && authorized for projectId `mta-sms`
 * (see getHubUser) — i.e. the caller has a UserProject assignment to an active,
 * non-restricted project. That assignment IS the access grant, so ANY resolved
 * hub user (including role "user" — assigned members) may manage T-Letter
 * sites. Do NOT re-narrow this to admin-tier roles: that contradicts the
 * documented member-access design and 403s assigned members. Destructive
 * actions stay safe because deletes are soft (recoverable in the Recycle Bin).
 */
export function isAuthorizedHubUser(user: HubUser | null): boolean {
  return !!user;
}

export function forbidden(
  message = "Sign in to OxfordHub — you need an account assigned to this project to manage T-Letter sites."
): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
