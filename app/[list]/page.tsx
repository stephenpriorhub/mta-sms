import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PublicPost, { type ArchiveItem } from "@/components/PublicPost";

// ISR: cached HTML for speed, refreshed often enough to reveal scheduled posts.
export const revalidate = 60;

async function getList(slug: string) {
  return prisma.list.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ list: string }>;
}): Promise<Metadata> {
  const { list: slug } = await params;
  const list = await getList(slug);
  return { title: list?.name ?? "MTA T-Letter" };
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
    where: { listId: list.id, publishDate: { lte: now } },
    orderBy: { publishDate: "desc" },
  });

  if (!latest) {
    return (
      <>
        <header className="tl-header" style={{ background: "var(--navy)", padding: "14px 18px", textAlign: "center" }}>
          <span style={{ color: "var(--cream)", fontWeight: 700, letterSpacing: ".14em", fontSize: 13, textTransform: "uppercase" }}>
            {list.name}
          </span>
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
