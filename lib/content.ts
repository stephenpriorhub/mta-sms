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

// Block-level tags that signal the content is already structured HTML.
const BLOCK_RE =
  /<(p|div|ul|ol|li|table|thead|tbody|tr|td|th|h[1-6]|blockquote|pre|figure)\b/i;

/**
 * Ensure post content has real paragraph/line-break structure so it renders with
 * proper vertical spacing (and never "mushed together").
 *
 * - If the content already contains block-level tags, it's treated as authored
 *   HTML and returned unchanged.
 * - Otherwise it's legacy/plain text (which may still contain inline tags like
 *   <a>/<b>): blank lines become paragraph breaks and single newlines become
 *   <br>. This migrates older posts that were saved as plain text with newlines.
 */
export function normalizeContentHtml(input: string): string {
  if (!input) return "";
  const html = input.trim();
  if (!html) return "";
  if (BLOCK_RE.test(html)) return html;
  return html
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${block.replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Wrap every <table> in a horizontally-scrollable container so wide tables
 * scroll on mobile instead of breaking the layout. Applied on the public side.
 */
export function wrapTables(html: string): string {
  if (!html) return "";
  return html.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (m) => `<div class="tl-tablewrap">${m}</div>`
  );
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
