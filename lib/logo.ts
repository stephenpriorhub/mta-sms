// Header logo sizing + header color, shared by the admin editor and the public pages.
export const DEFAULT_LOGO_HEIGHT = 34;
export const MIN_LOGO_HEIGHT = 16;
export const MAX_LOGO_HEIGHT = 120;

export function clampLogoHeight(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_LOGO_HEIGHT, Math.max(MIN_LOGO_HEIGHT, n));
}

export function logoHeightOf(list: { logoHeight?: number | null }): number {
  return clampLogoHeight(list.logoHeight) ?? DEFAULT_LOGO_HEIGHT;
}

// Matches --navy in globals.css.
export const DEFAULT_HEADER_COLOR = "#0f2440";

export function cleanHeaderColor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const c = v.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(c) ? c : null;
}

export function headerColorOf(list: { headerColor?: string | null }): string {
  return cleanHeaderColor(list.headerColor) ?? DEFAULT_HEADER_COLOR;
}
