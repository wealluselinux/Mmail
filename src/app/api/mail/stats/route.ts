import { NextResponse } from "next/server";
import { getInboxStats } from "@/lib/gmail";
import { getAccessToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/mail/stats : unread and total counts for the inbox. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const token = await getAccessToken(user.google_sub);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  try {
    return NextResponse.json(await getInboxStats(token));
  } catch {
    return NextResponse.json({ error: "gmail_error" }, { status: 502 });
  }
}
