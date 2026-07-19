"use client";

import { sanitizeHtml } from "@/lib/content";
import { CRITICAL_CSS } from "@/components/PublicPost";

// Lightweight, client-side live preview of a post. Uses the SAME markup, class
// names and critical CSS as the public <PublicPost> component so what the author
// sees matches the rendered public page exactly. Links are NOT rewritten through
// the /r tracker here (the post may not have an id yet) and no page-view pixel is
// emitted — this is a visual preview only.
export interface PostPreviewValues {
  title: string;
  publishDate: string; // datetime-local value
  content: string;
  topAdEnabled: boolean;
  topAdText: string;
  topAdLink: string;
  actionToTake: string;
  actionSecondary: string;
  buttonText: string;
  buttonUrl: string;
}

function fmtDate(value: string): string {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PostPreview({
  values,
  logoUrl,
  listName,
}: {
  values: PostPreviewValues;
  logoUrl: string | null;
  listName: string;
}) {
  const showTopAd = values.topAdEnabled && values.topAdText.trim().length > 0;
  const showAction = values.actionToTake.trim().length > 0;
  const showButton = !!values.buttonText.trim() && !!values.buttonUrl.trim();
  const bodyHtml = sanitizeHtml(values.content);

  return (
    <div className="tl-preview">
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      <div className="tl-preview-frame">
        <header className="tl-header">
          {/* Default header logo is ALWAYS the MTA cream image, never text. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="tl-logo-img"
            src={logoUrl || "/logo-cream.png"}
            alt={listName}
          />
        </header>

        <main className="tl-wrap">
          {showTopAd &&
            (values.topAdLink.trim() ? (
              <a className="tl-topad" href="#" onClick={(e) => e.preventDefault()}>
                {values.topAdText}
              </a>
            ) : (
              <div className="tl-topad">{values.topAdText}</div>
            ))}

          <article className="tl-card">
            <p className="tl-date">{fmtDate(values.publishDate)}</p>
            {values.title && <h1 className="tl-title">{values.title}</h1>}

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
                      __html: sanitizeHtml(values.actionToTake),
                    }}
                  />
                </div>
                {values.actionSecondary.trim() && (
                  <p className="tl-action-secondary">{values.actionSecondary}</p>
                )}
                {showButton && (
                  <a
                    className="tl-btn"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    {values.buttonText}
                  </a>
                )}
              </div>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
