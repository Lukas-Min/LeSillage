import { NextResponse, type NextRequest } from "next/server";
import { isValidEmailLink } from "@/lib/email-links";
import { unsubscribeEmail } from "@/lib/marketing-recipients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readLink(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return { email: (params.get("email") ?? "").trim().toLowerCase(), token: params.get("token") ?? "" };
}

/** RFC 8058 one-click unsubscribe: Gmail and Apple Mail POST here from their
 *  own Unsubscribe button (the List-Unsubscribe header on marketing email). */
export async function POST(request: NextRequest) {
  const { email, token } = readLink(request);
  if (!isValidEmailLink("unsubscribe", email, token)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }
  await unsubscribeEmail(email);
  return NextResponse.json({ ok: true });
}

/** Opened in a browser instead: show the page with its Unsubscribe button. */
export async function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", request.nextUrl.origin);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}
