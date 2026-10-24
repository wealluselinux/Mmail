import { NextResponse } from "next/server";
import { GmailError, listLabels } from "@/lib/gmail";
import { getAccessToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/mail/labels : all system folders, categories and user labels with counts. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const token = await getAccessToken(user.google_sub);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  try {
    return NextResponse.json({ labels: await listLabels(token) });
  } catch (e) {
    const status = e instanceof GmailError && e.status === 401 ? 401 : 502;
    return NextResponse.json({ error: "gmail_error" }, { status });
  }
}
