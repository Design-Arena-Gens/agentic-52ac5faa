import { NextRequest, NextResponse } from "next/server";
import { createBooking, rescheduleBooking } from "@/lib/calendar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "create") {
      const booking = await createBooking(body.input);
      return NextResponse.json({ booking });
    }
    if (body.action === "reschedule") {
      const updated = await rescheduleBooking(body.bookingId, body.datetimeISO);
      return NextResponse.json({ booking: updated });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unhandled error" }, { status: 500 });
  }
}

