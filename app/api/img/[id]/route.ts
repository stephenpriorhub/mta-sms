import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serve an uploaded (already resized/compressed) image. Immutable + long cache:
// asset bytes never change for a given id.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(Buffer.from(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(asset.bytes.length),
    },
  });
}
