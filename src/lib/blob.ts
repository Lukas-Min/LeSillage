import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getEnv } from "./env";

export interface UploadResult {
  url: string;
  pathname: string;
}

const PUBLIC_PREFIX = "public";
const PRIVATE_PREFIX = "private";

export async function uploadPublicImage(
  prefix: string,
  file: { name: string; type: string; bytes: ArrayBuffer },
): Promise<UploadResult> {
  return uploadImage(PUBLIC_PREFIX, prefix, file);
}

export async function uploadPrivateImage(
  prefix: string,
  file: { name: string; type: string; bytes: ArrayBuffer },
): Promise<UploadResult> {
  return uploadImage(PRIVATE_PREFIX, prefix, file);
}

async function uploadImage(
  scope: "public" | "private",
  prefix: string,
  file: { name: string; type: string; bytes: ArrayBuffer },
): Promise<UploadResult> {
  validateImage(file);
  const env = getEnv();
  const ext = inferExtension(file);
  const safeName = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const pathname = `${scope}/${prefix}/${safeName}`;

  if (env.BLOB_READ_WRITE_TOKEN) {
    try {
      const mod = await import("@vercel/blob");
      const blob = await mod.put(pathname, file.bytes, {
        access: scope === "public" ? "public" : "private",
        contentType: file.type,
        token: env.BLOB_READ_WRITE_TOKEN,
      });
      return { url: blob.url, pathname };
    } catch {
      // fall through to local storage
    }
  }

  const baseDir = join(process.cwd(), ".blob", scope, prefix);
  await mkdir(baseDir, { recursive: true });
  const filePath = join(baseDir, safeName);
  await writeFile(filePath, Buffer.from(file.bytes));
  const baseUrl = env.BLOB_BASE_URL ?? "";
  const publicUrl = scope === "public" ? `${baseUrl}/${pathname}` : `${baseUrl}/api/admin/file?path=${encodeURIComponent(pathname)}`;
  return { url: publicUrl, pathname };
}

export function validateImage(file: { type: string; bytes: ArrayBuffer }): void {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Only JPEG, PNG, or WEBP images are accepted");
  }
  const length = file.bytes.byteLength;
  const maxBytes = 8 * 1024 * 1024;
  if (length === 0) throw new Error("Image is empty");
  if (length > maxBytes) throw new Error("Image exceeds 8MB limit");
  const head = new Uint8Array(file.bytes, 0, Math.min(length, 12));
  if (!readSignature(head)) throw new Error("Image content does not match its declared type");
}

function readSignature(head: Uint8Array): boolean {
  if (head.length < 4) return false;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isWebp =
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[4] === 0x57 && head[5] === 0x45 && head[6] === 0x42 && head[7] === 0x50;
  return isJpeg || isPng || isWebp;
}

function inferExtension(file: { type: string; name: string }): string {
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  const match = /\.([a-z0-9]+)$/i.exec(file.name);
  return match ? `.${match[1].toLowerCase()}` : ".bin";
}