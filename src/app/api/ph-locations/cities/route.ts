import { NextResponse, type NextRequest } from "next/server";
import { fetchCityOptions } from "@/lib/ph-locations";

export async function GET(request: NextRequest) {
  const province = request.nextUrl.searchParams.get("province");
  if (!province) return NextResponse.json({ error: "Missing province" }, { status: 400 });
  const cities = await fetchCityOptions(province);
  return NextResponse.json(cities);
}
