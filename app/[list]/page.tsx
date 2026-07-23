import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PublicPost, { type ArchiveItem } from "@/components/PublicPost";
import { SITE_URL, publicListUrl } from "@/lib/site";

// ISR: cached HTML for speed, refreshed often enough to reveal scheduled posts.
export const revalidate = 60;

async function getList(slug: string) {
  // A soft-deleted list's slug must 404 publicly (deletedAt: null).
  return prisma.list.findFirst({ where: { slug, deletedAt: null } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ list: string }>;
}): Promise<Metadata> {
  const { list: slug } = await params;
  const list = await getList(slug);
  const title = list?.name ?? "MTA T-Letter";
  const canonical = publicListUrl(slug);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    alternates: { canonical },
    openGraph: { url: canonical, title, siteName: title, type: "website" },
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ list: string }>;
}) {
  const { list: slug } = await params;
  const list = await getList(slug);
  if (!list) notFound();

  const now = new Date();
  const latest = await prisma.post.findFirst({
    where: { listId: list.id, deletedAt: null, publishDate: { lte: now } },
    orderBy: { publishDate: "desc" },
  });

  if (!latest) {
    return (
      <>
        <header
          style={{
            background: "var(--navy)",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Default header logo is ALWAYS the MTA cream image, never text; links to MTA. */}
          <a
            href="https://monumenttradersalliance.com"
            target="_blank"
            rel="noopener"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={list.logoUrl || "/logo-cream.png"}
              alt={list.name}
              style={{ maxHeight: 34, width: "auto", display: "block" }}
            />
          </a>
        </header>
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 16px", color: "var(--muted)" }}>
          No posts yet.
        </main>
      </>
    );
  }

  const archives: ArchiveItem[] = list.archivesEnabled
    ? await prisma.post.findMany({
        where: {
          listId: list.id,
          deletedAt: null,
          publishDate: { lte: now },
          id: { not: latest.id },
        },
        orderBy: { publishDate: "desc" },
        select: { id: true, title: true, publishDate: true },
        take: 100,
      })
    : [];

  return <PublicPost list={list} post={latest} archives={archives} />;
}
