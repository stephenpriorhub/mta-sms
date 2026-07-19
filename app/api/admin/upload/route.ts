import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { processImage } from "@/lib/image";

export const dynamic = "force-dynamic";

// Accepts multipart/form-data with a single `file`. Resizes/compresses to webp,
// stores the bytes, and returns the public URL to embed.
export async function POST(req: NextRequest) {
  if (!isHubAdmin(await getHubUser(req))) return forbidden();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processImage(input);
  } catch {
    return NextResponse.json({ error: "could not process image" }, { status: 422 });
  }

  const asset = await prisma.asset.create({
    data: {
      mime: processed.mime,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
    },
    select: { id: true, width: true, height: true },
  });

  return NextResponse.json({
    id: asset.id,
    url: `/api/img/${asset.id}`,
    width: asset.width,
    height: asset.height,
  });
}
