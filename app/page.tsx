import type { Metadata } from "next";

// The public site is path-per-list and every list is FULLY ISOLATED — so the
// root intentionally lists nothing and links nowhere. It exists only so the bare
// domain resolves to a clean, branded page instead of a 404.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Monument Traders Alliance",
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <>
      <header
        style={{
          background: "var(--navy)",
          padding: "16px 18px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-cream.png"
          alt="Monument Traders Alliance"
          style={{ maxHeight: 36, width: "auto" }}
        />
      </header>
      <main
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "64px 20px",
          textAlign: "center",
          color: "var(--muted)",
        }}
      >
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          Monument Traders Alliance T-Letter.
        </p>
      </main>
    </>
  );
}
