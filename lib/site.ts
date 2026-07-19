// Canonical PUBLIC base URL for the T-Letter sites.
//
// IMPORTANT: public-facing links (admin "view/share" links, <link rel=canonical>,
// OpenGraph URLs, etc.) must ALWAYS use this canonical domain — never the request
// host. The admin is served on mta-sms.oxfordhub.app, but the public site lives on
// mtasms.com, so deriving public links from the request host produces wrong links.
//
// Overridable via NEXT_PUBLIC_SITE_URL (set on the Railway mta-sms service); falls
// back to the known production domain so links are correct even if the env is unset.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mtasms.com"
).replace(/\/+$/, "");

/** Absolute public URL for a list landing page: https://mtasms.com/<slug> */
export function publicListUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

/** Absolute public URL for a single post: https://mtasms.com/<slug>/<postId> */
export function publicPostUrl(slug: string, postId: string): string {
  return `${SITE_URL}/${slug}/${postId}`;
}
