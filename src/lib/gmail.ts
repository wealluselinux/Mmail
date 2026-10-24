const API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** A folder id: "ALL" (All Mail), a Gmail system label (INBOX, SENT, ...) or a user label id. */
export function isMailboxId(value: string): boolean {
  return /^(ALL|[A-Za-z0-9_-]{1,64})$/.test(value);
}

export type MessageSummary = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string; // ISO
  unread: boolean;
  starred: boolean;
};

export type MessageDetail = MessageSummary & {
  to: string;
  cc: string;
  replyTo: string;
  /** The RFC 2822 Message-ID header, needed to thread replies. */
  messageId: string;
  references: string;
  html: string | null;
  text: string | null;
};

export type LabelInfo = {
  id: string;
  name: string;
  kind: "system" | "category" | "user";
  unread: number;
  total: number;
};

type Header = { name: string; value: string };
type Part = {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: Part & { headers?: Header[] };
};

export class GmailError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gmail<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new GmailError(res.status, `Gmail API error (${res.status})`);
  return res.json();
}

function header(headers: Header[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Splits `"Ada Lovelace" <ada@example.com>` into display name and address. */
export function parseAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || match[2], email: match[2] };
  return { name: raw.trim(), email: raw.trim() };
}

function summarize(msg: GmailMessage): MessageSummary {
  const headers = msg.payload?.headers;
  const from = parseAddress(header(headers, "From"));
  const labels = msg.labelIds ?? [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: from.name || "(unknown sender)",
    fromEmail: from.email,
    subject: header(headers, "Subject") || "(no subject)",
    snippet: msg.snippet ?? "",
    date: new Date(Number(msg.internalDate ?? Date.now())).toISOString(),
    unread: labels.includes("UNREAD"),
    starred: labels.includes("STARRED"),
  };
}

export async function listMessages(
  token: string,
  opts: { mailbox: string; query?: string; pageToken?: string; max?: number },
): Promise<{ messages: MessageSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({ maxResults: String(opts.max ?? 25) });
  if (opts.mailbox === "ALL") {
    // Gmail's "All Mail" is everything except Spam and Trash.
    params.set("q", ["-in:trash -in:spam", opts.query].filter(Boolean).join(" "));
  } else {
    params.set("labelIds", opts.mailbox);
    if (opts.query) params.set("q", opts.query);
  }
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  const list = await gmail<{
    messages?: { id: string }[];
    nextPageToken?: string;
  }>(token, `/messages?${params}`);

  const ids = list.messages ?? [];
  const messages = await Promise.all(
    ids.map(({ id }) => {
      const meta = new URLSearchParams({ format: "metadata" });
      for (const h of ["From", "Subject"]) meta.append("metadataHeaders", h);
      return gmail<GmailMessage>(token, `/messages/${id}?${meta}`).then(summarize);
    }),
  );
  return { messages, nextPageToken: list.nextPageToken ?? null };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function findBody(part: Part | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findBody(child, mime);
    if (found) return found;
  }
  return null;
}

export async function getMessage(token: string, id: string): Promise<MessageDetail> {
  const msg = await gmail<GmailMessage>(token, `/messages/${encodeURIComponent(id)}?format=full`);
  const base = summarize(msg);
  const h = msg.payload?.headers;
  return {
    ...base,
    to: header(h, "To"),
    cc: header(h, "Cc"),
    replyTo: header(h, "Reply-To"),
    messageId: header(h, "Message-ID") || header(h, "Message-Id"),
    references: header(h, "References"),
    html: findBody(msg.payload, "text/html"),
    text: findBody(msg.payload, "text/plain"),
  };
}

export async function modifyMessage(
  token: string,
  id: string,
  change: { addLabelIds?: string[]; removeLabelIds?: string[] },
): Promise<void> {
  await gmail(token, `/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    body: JSON.stringify(change),
  });
}

export async function getInboxStats(
  token: string,
): Promise<{ unread: number; total: number }> {
  const label = await gmail<{ messagesUnread?: number; messagesTotal?: number }>(
    token,
    "/labels/INBOX",
  );
  return { unread: label.messagesUnread ?? 0, total: label.messagesTotal ?? 0 };
}

export async function trashMessage(token: string, id: string): Promise<void> {
  await gmail(token, `/messages/${encodeURIComponent(id)}/trash`, { method: "POST" });
}

/* ---------- labels ---------- */

const SYSTEM_LABELS = ["INBOX", "STARRED", "IMPORTANT", "SENT", "DRAFT", "SPAM", "TRASH", "CHAT"];
const CATEGORY_LABELS = [
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
];

/**
 * Every label Gmail exposes through its API: the system folders, the five inbox
 * categories, and all of the user's own labels, each with unread and total counts.
 * (Gmail's "Snoozed" and "Scheduled" views are not available through the API.)
 */
export async function listLabels(token: string): Promise<LabelInfo[]> {
  const list = await gmail<{ labels?: { id: string; name: string; type: string }[] }>(
    token,
    "/labels",
  );
  const all = list.labels ?? [];

  const wanted = all
    .filter(
      (l) =>
        SYSTEM_LABELS.includes(l.id) || CATEGORY_LABELS.includes(l.id) || l.type === "user",
    )
    .slice(0, 80);

  const counted = await Promise.all(
    wanted.map(async (l): Promise<LabelInfo> => {
      const kind = CATEGORY_LABELS.includes(l.id)
        ? "category"
        : l.type === "user"
          ? "user"
          : "system";
      try {
        const detail = await gmail<{ messagesUnread?: number; messagesTotal?: number }>(
          token,
          `/labels/${encodeURIComponent(l.id)}`,
        );
        return {
          id: l.id,
          name: l.name,
          kind,
          unread: detail.messagesUnread ?? 0,
          total: detail.messagesTotal ?? 0,
        };
      } catch {
        return { id: l.id, name: l.name, kind, unread: 0, total: 0 };
      }
    }),
  );
  return counted;
}

/* ---------- sending ---------- */

const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

/** Pulls plain addresses out of a "a@x.com, Bob <b@y.com>" style list. Returns null if any is invalid. */
export function parseRecipients(raw: string): string[] | null {
  const parts = raw
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const angle = p.match(/<([^>]+)>\s*$/);
    const email = (angle ? angle[1] : p).trim();
    if (!EMAIL.test(email)) return null;
    out.push(email);
  }
  return out;
}

/** Makes a header value safe: no line breaks (blocks header injection), RFC 2047 for non-ASCII. */
function headerValue(v: string): string {
  const clean = v.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7e]*$/.test(clean)
    ? clean
    : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

export type OutgoingMessage = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
};

function buildRaw(m: OutgoingMessage): string {
  const lines = [`To: ${m.to.join(", ")}`];
  if (m.cc?.length) lines.push(`Cc: ${m.cc.join(", ")}`);
  if (m.bcc?.length) lines.push(`Bcc: ${m.bcc.join(", ")}`);
  lines.push(`Subject: ${headerValue(m.subject)}`);
  if (m.inReplyTo) lines.push(`In-Reply-To: ${headerValue(m.inReplyTo)}`);
  if (m.references) lines.push(`References: ${headerValue(m.references)}`);
  lines.push(
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  );
  const body = (Buffer.from(m.body, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
  return Buffer.from(`${lines.join("\r\n")}\r\n\r\n${body}\r\n`, "utf8").toString("base64url");
}

export async function sendMessage(token: string, m: OutgoingMessage): Promise<string> {
  const sent = await gmail<{ id: string }>(token, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: buildRaw(m), ...(m.threadId ? { threadId: m.threadId } : {}) }),
  });
  return sent.id;
}
