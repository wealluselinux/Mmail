import { NextRequest, NextResponse } from "next/server";
import { GmailError, isMailboxId, listMessages } from "@/lib/gmail";
import { getAccessToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/mail?mailbox=INBOX&q=...&pageToken=... : lists message summaries. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const token = await getAccessToken(user.google_sub);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const mailbox = params.get("mailbox") ?? "INBOX";
  if (!isMailboxId(mailbox)) {
    return NextResponse.json({ error: "invalid_mailbox" }, { status: 400 });
  }

  try {
    const result = await listMessages(token, {
      mailbox,
      query: params.get("q")?.slice(0, 500) || undefined,
      pageToken: params.get("pageToken") || undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    const status = e instanceof GmailError && e.status === 401 ? 401 : 502;
    return NextResponse.json({ error: "gmail_error" }, { status });
  }
}
