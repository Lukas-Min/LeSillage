import { NextResponse, type NextRequest } from "next/server";
import { fetchBarangayOptions } from "@/lib/ph-locations";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city) return NextResponse.json({ error: "Missing city" }, { status: 400 });
  const barangays = await fetchBarangayOptions(city);
  return NextResponse.json(barangays);
}
