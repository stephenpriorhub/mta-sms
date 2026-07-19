import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PublicPost, { type ArchiveItem } from "@/components/PublicPost";
import { SITE_URL, publicPostUrl } from "@/lib/site";

export const revalidate = 60;

async function load(slug: string, postId: string) {
  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list) return null;
  const post = await prisma.post.findFirst({
    where: { id: postId, listId: list.id },
  });
  return post ? { list, post } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ list: string; postId: string }>;
}): Promise<Metadata> {
  const { list: slug, postId } = await params;
  const data = await load(slug, postId);
  const title = data?.post.title ?? data?.list.name ?? "MTA T-Letter";
  const canonical = publicPostUrl(slug, postId);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title,
      siteName: data?.list.name ?? "MTA T-Letter",
      type: "article",
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ list: string; postId: string }>;
}) {
  const { list: slug, postId } = await params;
  const data = await load(slug, postId);
  if (!data) notFound();
  const { list, post } = data;

  // Scheduled (future) posts stay hidden on their own URL too.
  if (post.publishDate.getTime() > Date.now()) notFound();

  const archives: ArchiveItem[] = list.archivesEnabled
    ? await prisma.post.findMany({
        where: {
          listId: list.id,
          publishDate: { lte: new Date() },
          id: { not: post.id },
        },
        orderBy: { publishDate: "desc" },
        select: { id: true, title: true, publishDate: true },
        take: 100,
      })
    : [];

  return <PublicPost list={list} post={post} archives={archives} />;
}
