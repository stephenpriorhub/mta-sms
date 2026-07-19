import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTA T-Letter",
  description: "Monument Traders Alliance",
  icons: {
    // Black chess-pieces mark (canonical MTA icon from the brain vault).
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Root layout is intentionally minimal: NO shared navigation and NO hub-nav.js.
// The admin surface adds its own chrome + SSO in app/admin/layout.tsx.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
