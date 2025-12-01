import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/calendar";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || undefined;
  const service = searchParams.get("service") || undefined;
  const timezone = searchParams.get("tz") || undefined;
  const slots = await getAvailability({ date, service, timezone });
  return NextResponse.json({ slots });
}

