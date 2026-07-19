/**
 * Content helpers for post bodies (author-supplied HTML: links + inline images).
 *
 * SCAFFOLD-LEVEL sanitizer: authors are trusted OxfordHub admins, but we still
 * strip the obvious script vectors. Hardening note for v2: swap this for a
 * vetted isomorphic sanitizer (e.g. sanitize-html) before opening authoring to
 * lower-trust users.
 */

/** Remove script/style/iframe/event-handlers and javascript: URLs. */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  let out = html;
  // Drop dangerous elements entirely (with their content).
  out = out.replace(/<\s*(script|style|iframe|object|embed|form)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  // Drop stray opening tags of those elements too.
  out = out.replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*>/gi, "");
  // Strip inline event handlers: on*="..." / on*='...'.
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  // Neutralise javascript:/data:text URLs in href/src.
  out = out.replace(/(href|src)\s*=\s*"(\s*javascript:|\s*data:text)[^"]*"/gi, '$1="#"');
  out = out.replace(/(href|src)\s*=\s*'(\s*javascript:|\s*data:text)[^']*'/gi, "$1='#'");
  return out;
}

const HTTP_URL = /^https?:\/\//i;

/**
 * Rewrite every <a href="..."> in post content to route through the first-party
 * /r/[postId] redirect so clicks are tracked. Only absolute http(s) links are
 * rewritten (anchors, mailto, relative links pass through untouched).
 */
export function rewriteLinksForTracking(html: string, postId: string): string {
  if (!html) return "";
  return html.replace(
    /(<a\b[^>]*?\bhref\s*=\s*)("([^"]*)"|'([^']*)')/gi,
    (match, prefix: string, _q: string, dq?: string, sq?: string) => {
      const url = (dq ?? sq ?? "").trim();
      if (!HTTP_URL.test(url)) return match;
      const tracked = `/r/${postId}?u=${encodeURIComponent(url)}&label=content-link`;
      return `${prefix}"${tracked}"`;
    }
  );
}

/** Build a tracked redirect URL for a standalone link (e.g. the Action button). */
export function trackedHref(postId: string, url: string, label: string): string {
  return `/r/${postId}?u=${encodeURIComponent(url)}&label=${encodeURIComponent(label)}`;
}

/** Whether a post is publicly visible now (publishDate not in the future). */
export function isPublished(publishDate: Date, now = new Date()): boolean {
  return publishDate.getTime() <= now.getTime();
}
