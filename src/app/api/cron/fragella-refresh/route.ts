import { NextResponse, type NextRequest } from "next/server";
import { refreshStaleFragellaRecords } from "@/actions/fragrantica-actions";
import { refreshFragellaMirrorStaleRows } from "@/lib/fragella-mirror";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : header;
  return bearer === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const budget = Number(process.env.FRAGELLA_DAILY_REQUEST_BUDGET ?? 8);
  const productsBudget = Math.max(1, Math.floor(budget / 2));
  const mirrorBudget = Math.max(1, budget - productsBudget);
  try {
    const [productsSummary, mirrorSummary] = await Promise.all([
      refreshStaleFragellaRecords(),
      refreshFragellaMirrorStaleRows(mirrorBudget),
    ]);
    return NextResponse.json({
      ok: true,
      products: productsSummary,
      mirror: mirrorSummary,
      budget,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}