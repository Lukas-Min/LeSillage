import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import { normalize, resolve } from "node:path";
import { auth } from "@/auth";
import { getEnv } from "@/lib/env";

const ALLOWED_ROOT = "private/";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "CUSTOMER";
  if (!session?.user || role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const raw = request.nextUrl.searchParams.get("path");
  if (!raw) return new NextResponse("Missing path", { status: 400 });
  const decoded = decodeURIComponent(raw);
  const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  if (!safe.startsWith(ALLOWED_ROOT)) {
    return new NextResponse("Only private paths are allowed", { status: 400 });
  }
  const env = getEnv();
  if (env.RECEIPTS_READ_WRITE_TOKEN) {
    const { get } = await import("@vercel/blob");
    const result = await get(safe, { access: "private", token: env.RECEIPTS_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  const root = resolve(process.cwd(), ".blob");
  const resolved = resolve(root, safe);
  if (!resolved.startsWith(root)) {
    return new NextResponse("Invalid path", { status: 400 });
  }
  try {
    const data = await fs.readFile(resolved);
    return new NextResponse(data, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export const runtime = "nodejs";
