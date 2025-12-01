import { NextRequest, NextResponse } from "next/server";
import { handleMessage, initialState, AgentState } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { message, state } = (await req.json()) as {
      message: string;
      state?: AgentState | null;
    };
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    const parsedState = state ?? initialState();
    const result = await handleMessage(message, parsedState);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Unhandled error" }, { status: 500 });
  }
}

