import { NextRequest, NextResponse } from "next/server";
import { getMessage, GmailError, modifyMessage, trashMessage } from "@/lib/gmail";
import { getAccessToken, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function authorize() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  const token = await getAccessToken(user.google_sub);
  if (!token) return { error: NextResponse.json({ error: "reauth_required" }, { status: 401 }) };
  return { token };
}

function failure(e: unknown) {
  const status = e instanceof GmailError && [401, 404].includes(e.status) ? e.status : 502;
  return NextResponse.json({ error: "gmail_error" }, { status });
}

// Gmail message ids are hex strings; reject anything else before it reaches the API path.
const ID_PATTERN = /^[0-9a-f]{8,32}$/i;

/** GET /api/mail/:id : full message with body. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mail/[id]">) {
  const { id } = await ctx.params;
  if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const auth = await authorize();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await getMessage(auth.token, id));
  } catch (e) {
    return failure(e);
  }
}

/**
 * PATCH /api/mail/:id with { action }: read | unread | star | unstar | archive | trash
 */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/mail/[id]">) {
  const { id } = await ctx.params;
  if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const auth = await authorize();
  if (auth.error) return auth.error;

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  try {
    switch (body?.action) {
      case "read":
        await modifyMessage(auth.token, id, { removeLabelIds: ["UNREAD"] });
        break;
      case "unread":
        await modifyMessage(auth.token, id, { addLabelIds: ["UNREAD"] });
        break;
      case "star":
        await modifyMessage(auth.token, id, { addLabelIds: ["STARRED"] });
        break;
      case "unstar":
        await modifyMessage(auth.token, id, { removeLabelIds: ["STARRED"] });
        break;
      case "archive":
        await modifyMessage(auth.token, id, { removeLabelIds: ["INBOX"] });
        break;
      case "trash":
        await trashMessage(auth.token, id);
        break;
      default:
        return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
