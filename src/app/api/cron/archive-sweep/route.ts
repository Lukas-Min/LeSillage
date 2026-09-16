import { NextResponse, type NextRequest } from "next/server";
import { sweepArchivedAccounts } from "@/lib/archive-sweep";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret) return header === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sweepArchivedAccounts();
  return NextResponse.json(result);
}
