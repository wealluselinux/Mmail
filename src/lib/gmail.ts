const API = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Mailboxes Mmail exposes. Each maps to a Gmail system label. */
export const MAILBOXES = ["INBOX", "STARRED", "SENT", "DRAFT", "SPAM", "TRASH"] as const;
export type Mailbox = (typeof MAILBOXES)[number];

export function isMailbox(value: string): value is Mailbox {
  return (MAILBOXES as readonly string[]).includes(value);
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
  html: string | null;
  text: string | null;
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
function parseAddress(raw: string): { name: string; email: string } {
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
  opts: { mailbox: Mailbox; query?: string; pageToken?: string; max?: number },
): Promise<{ messages: MessageSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    labelIds: opts.mailbox,
    maxResults: String(opts.max ?? 25),
  });
  if (opts.query) params.set("q", opts.query);
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
  return {
    ...base,
    to: header(msg.payload?.headers, "To"),
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

export async function trashMessage(token: string, id: string): Promise<void> {
  await gmail(token, `/messages/${encodeURIComponent(id)}/trash`, { method: "POST" });
}
