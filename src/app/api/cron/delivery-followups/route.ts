import { NextResponse, type NextRequest } from "next/server";
import { sendDueDeliveryFollowups } from "@/lib/delivery-followups";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendDueDeliveryFollowups();
  return NextResponse.json(result);
}
