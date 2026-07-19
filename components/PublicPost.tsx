import { sanitizeHtml, rewriteLinksForTracking, trackedHref } from "@/lib/content";

// Minimal, mobile-first. Ships ZERO client JavaScript: the archives accordion is
// a native <details>, page views use an <img> pixel, and link clicks go through
// the /r redirect. Critical CSS is inlined below.

export interface PublicListData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  archivesEnabled: boolean;
}

export interface PublicPostData {
  id: string;
  title: string | null;
  publishDate: Date;
  content: string;
  // Post-level top text-ad box.
  topAdEnabled: boolean;
  topAdText: string | null;
  topAdLink: string | null;
  actionToTake: string | null;
  actionSecondary: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface ArchiveItem {
  id: string;
  title: string | null;
  publishDate: Date;
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const CRITICAL_CSS = `
.tl-header{background:var(--navy);padding:14px 18px;display:flex;justify-content:center;align-items:center}
.tl-logo-img{max-height:34px;width:auto}
.tl-logo-text{color:var(--cream);font-weight:700;letter-spacing:.14em;font-size:13px;text-transform:uppercase}
.tl-wrap{max-width:680px;margin:0 auto;padding:18px 16px 56px}
.tl-topad{display:block;background:#f0f2f6;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:18px;color:var(--muted);font-size:13px;line-height:1.45;text-decoration:none}
.tl-topad:hover{background:#e9edf3}
.tl-card{background:var(--card);border-radius:var(--radius);padding:24px 20px 8px}
.tl-date{color:var(--muted);font-size:13px;margin:0 0 6px}
.tl-title{color:var(--navy);font-size:24px;line-height:1.25;font-weight:700;margin:0 0 16px}
.tl-body{color:var(--article-ink);font-size:16.5px;line-height:1.6;word-break:break-word}
.tl-body p{margin:0 0 1em}
.tl-body p:last-child{margin-bottom:0}
.tl-body img{border-radius:8px;margin:14px 0}
.tl-body a{color:var(--accent)}
.tl-action{background:var(--callout-bg);border-radius:8px;padding:20px;margin-top:24px}
.tl-action-line{color:var(--article-ink);font-size:18.5px;line-height:1.5;margin:0}
.tl-action-label{font-weight:700;color:var(--article-ink)}
.tl-action-text{color:var(--action-green);font-weight:700}
.tl-action-text p{display:inline;margin:0}
.tl-action-text a{color:var(--action-green)}
.tl-action-secondary{color:var(--action-muted);font-size:12.5px;font-style:italic;line-height:1.5;margin:10px 0 0}
.tl-btn{display:block;width:fit-content;background:var(--navy);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 22px;border-radius:8px;margin:16px auto 0}
.tl-btn:hover{background:var(--navy-soft)}
.tl-archives{margin-top:26px;border-top:1px solid var(--line);padding-top:14px}
.tl-archives summary{cursor:pointer;color:var(--muted);font-size:14px;font-weight:600;list-style:none}
.tl-archives summary::-webkit-details-marker{display:none}
.tl-archives ul{list-style:none;padding:0;margin:12px 0 0}
.tl-archives li{padding:8px 0;border-bottom:1px solid var(--line)}
.tl-archives a{color:var(--accent);text-decoration:none;font-size:15px}
.tl-arch-date{color:var(--muted);font-size:12px;display:block}
.tl-px{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
`;

export default function PublicPost({
  list,
  post,
  archives,
}: {
  list: PublicListData;
  post: PublicPostData;
  archives: ArchiveItem[];
}) {
  const bodyHtml = rewriteLinksForTracking(sanitizeHtml(post.content), post.id);
  const showAction = !!post.actionToTake && post.actionToTake.trim().length > 0;
  const showButton = !!post.buttonText?.trim() && !!post.buttonUrl?.trim();
  // Top ad now lives on the POST: show whenever enabled + text present (link optional).
  const showTopAd = post.topAdEnabled && !!post.topAdText?.trim();
  const topAdHasLink = !!post.topAdLink?.trim();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />

      <header className="tl-header">
        {/* Per-list logo overrides; default is the MTA cream wordmark. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="tl-logo-img"
          src={list.logoUrl || "/logo-cream.png"}
          alt={list.name}
        />
      </header>

      <main className="tl-wrap">
        {showTopAd &&
          (topAdHasLink ? (
            <a
              className="tl-topad"
              href={trackedHref(post.id, post.topAdLink!, "top-ad")}
              rel="nofollow"
            >
              {post.topAdText}
            </a>
          ) : (
            <div className="tl-topad">{post.topAdText}</div>
          ))}

        <article className="tl-card">
          <p className="tl-date">{fmtDate(post.publishDate)}</p>
          {post.title && <h1 className="tl-title">{post.title}</h1>}

          <div
            className="tl-body"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {showAction && (
            <div className="tl-action">
              <div className="tl-action-line">
                <strong className="tl-action-label">Action to take:</strong>{" "}
                <span
                  className="tl-action-text"
                  dangerouslySetInnerHTML={{
                    __html: rewriteLinksForTracking(
                      sanitizeHtml(post.actionToTake!),
                      post.id
                    ),
                  }}
                />
              </div>
              {post.actionSecondary?.trim() && (
                <p className="tl-action-secondary">{post.actionSecondary}</p>
              )}
              {showButton && (
                <a
                  className="tl-btn"
                  href={trackedHref(post.id, post.buttonUrl!, "action-button")}
                  rel="nofollow"
                >
                  {post.buttonText}
                </a>
              )}
            </div>
          )}
        </article>

        {list.archivesEnabled && archives.length > 0 && (
          <details className="tl-archives">
            <summary>View Archives</summary>
            <ul>
              {archives.map((a) => (
                <li key={a.id}>
                  <a href={`/${list.slug}/${a.id}`}>
                    {a.title || "Untitled"}
                    <span className="tl-arch-date">{fmtDate(a.publishDate)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>

      {/* First-party page-view pixel (no third-party analytics). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="tl-px"
        alt=""
        src={`/api/px?l=${list.id}&p=${post.id}`}
      />
    </>
  );
}
