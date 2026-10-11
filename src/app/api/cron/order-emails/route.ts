import { NextResponse, type NextRequest } from "next/server";
import { drainAllQueuedStatusEmails } from "@/lib/orders";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Retries order status emails still queued: a send that failed, or an
 *  after() that never got to run. Normally the queue is empty by now. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await drainAllQueuedStatusEmails();
  return NextResponse.json(result);
}
