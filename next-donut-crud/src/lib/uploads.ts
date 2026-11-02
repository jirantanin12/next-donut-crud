import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads");

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function getImageType(data: Buffer): { mimeType: string; extension: string } | null {
  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  const signature = data.toString("ascii", 0, 6);
  if (signature === "GIF87a" || signature === "GIF89a") {
    return { mimeType: "image/gif", extension: "gif" };
  }

  return null;
}

export async function saveImageUpload(file: File): Promise<string> {
  if (file.size === 0) {
    throw new UploadValidationError("ไฟล์รูปภาพว่างเปล่า");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new UploadValidationError("ขนาดไฟล์ต้องไม่เกิน 5 MB");
  }

  const data = Buffer.from(await file.arrayBuffer());
  const imageType = getImageType(data);

  if (!imageType || (file.type && file.type !== imageType.mimeType)) {
    throw new UploadValidationError("รองรับเฉพาะไฟล์ JPEG, PNG, WebP และ GIF");
  }

  await mkdir(UPLOAD_DIRECTORY, { recursive: true });

  const filename = `${randomUUID()}.${imageType.extension}`;
  await writeFile(path.join(UPLOAD_DIRECTORY, filename), data, { flag: "wx" });

  return `/uploads/${filename}`;
}
