import sharp from "sharp";

// Mobile-first: cap the longest edge and compress to webp. Newsletter inline
// images never need to be larger than this on a phone.
const MAX_EDGE = 1000;

export interface ProcessedImage {
  bytes: Buffer;
  width: number;
  height: number;
  mime: string;
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "none" })
    .rotate() // respect EXIF orientation
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    bytes: data,
    width: info.width,
    height: info.height,
    mime: "image/webp",
  };
}
