import { NextRequest, NextResponse } from "next/server";
import { GmailError, parseRecipients, sendMessage } from "@/lib/gmail";
import { getAccessToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 50;
const MAX_BODY = 200_000;

type Body = {
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  body?: unknown;
  inReplyTo?: unknown;
  references?: unknown;
  threadId?: unknown;
};

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * POST /api/mail/send : sends a new message, a reply, or a forward.
 * Requires the gmail.send permission; accounts signed in before it was added get a 403
 * with { error: "insufficient_scope" } and need to sign in again.
 */
export async function POST(req: NextRequest) {
  // Only accept real JSON requests, never a cross-site form post.
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 415 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const token = await getAccessToken(user.google_sub);
  if (!token) return NextResponse.json({ error: "reauth_required" }, { status: 401 });

  const data = (await req.json().catch(() => null)) as Body | null;
  if (!data) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const to = parseRecipients(str(data.to, 5000));
  const cc = parseRecipients(str(data.cc, 5000));
  const bcc = parseRecipients(str(data.bcc, 5000));
  if (!to || !cc || !bcc) {
    return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
  }
  if (to.length === 0) return NextResponse.json({ error: "no_recipient" }, { status: 400 });
  if (to.length + cc.length + bcc.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: "too_many_recipients" }, { status: 400 });
  }

  const body = str(data.body, MAX_BODY + 1);
  if (body.length > MAX_BODY) return NextResponse.json({ error: "too_long" }, { status: 400 });

  try {
    const id = await sendMessage(token, {
      to,
      cc,
      bcc,
      subject: str(data.subject, 500),
      body,
      inReplyTo: str(data.inReplyTo, 998) || undefined,
      references: str(data.references, 4000) || undefined,
      threadId: /^[0-9a-f]{8,32}$/i.test(str(data.threadId, 40)) ? str(data.threadId, 40) : undefined,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof GmailError && e.status === 403) {
      return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
    }
    if (e instanceof GmailError && e.status === 401) {
      return NextResponse.json({ error: "reauth_required" }, { status: 401 });
    }
    return NextResponse.json({ error: "gmail_error" }, { status: 502 });
  }
}
