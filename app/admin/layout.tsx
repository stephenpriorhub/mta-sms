import Script from "next/script";
import Link from "next/link";
import "./admin.css";

const PROJECT_ID = process.env.NEXT_PUBLIC_HUB_PROJECT_ID ?? "mta-sms";

// The ADMIN surface. hub-nav.js gates auth: it hides the page until it confirms
// a signed-in OxfordHub user, injects the hub nav bar, and shows a lockout
// otherwise. The public T-Letter pages never load this layout.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="adm">
      <div className="adm-topbar">
        <Link href="/admin" className="adm-brand" aria-label="MTA T-Letter Sites">
          {/* Default header logo is ALWAYS the MTA cream image, never text. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="adm-brand-logo" src="/logo-cream.png" alt="MTA T-Letter Sites" />
        </Link>
        <span className="adm-sub">T-Letter Admin</span>
        <Link href="/admin/trash" className="adm-topbar-link">
          Recycle Bin
        </Link>
      </div>
      <div className="adm-main">{children}</div>

      <Script
        src="https://oxfordhub.app/hub-nav.js"
        data-project-id={PROJECT_ID}
        strategy="afterInteractive"
        id="hub-nav"
      />
    </div>
  );
}
