"use client";

import { useEffect } from "react";

/**
 * Portrait Tracker (PaidSites/portrait-tracker). Its all.js also boots the
 * Lytics tag, so this one script covers both. Required on every page that
 * customers or leads see.
 *
 * Mount it only in public layouts or pages. As a second guard it never loads on
 * *.oxfordhub.app, which keeps third-party code off the hub's cookie domain.
 * Injected from an effect (not next/script) so the host check runs in the
 * browser, which keeps statically rendered pages static.
 */
export const PORTRAIT_TRACKER_SRC = "https://portrait-tracker.s3.amazonaws.com/all.js";

export default function PortraitTracker() {
  useEffect(() => {
    if (/(^|\.)oxfordhub\.app$/i.test(window.location.hostname)) return;
    if (document.getElementById("portrait-tracker")) return;
    const s = document.createElement("script");
    s.id = "portrait-tracker";
    s.async = true;
    s.src = PORTRAIT_TRACKER_SRC;
    document.head.appendChild(s);
  }, []);
  return null;
}
