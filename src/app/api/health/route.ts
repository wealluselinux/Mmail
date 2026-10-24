import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight check used by the keep-alive workflow. Touches no database. */
export function GET() {
  return NextResponse.json({ ok: true });
}
