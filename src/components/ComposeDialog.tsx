"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export type OriginalMessage = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  to: string;
  cc: string;
  replyTo: string;
  messageId: string;
  references: string;
  html: string | null;
  text: string | null;
};

export type ComposeRequest = {
  mode: "new" | "reply" | "replyAll" | "forward";
  original?: OriginalMessage;
};

const ERRORS: Record<string, string> = {
  insufficient_scope:
    "Material Mail needs permission to send mail. Sign out, sign in again, and allow sending when Google asks.",
  invalid_recipient: "One of the email addresses doesn't look right.",
  no_recipient: "Add at least one person in the To field.",
  too_many_recipients: "That's too many recipients for one message.",
  too_long: "That message is too long.",
  reauth_required: "Your Google session expired. Please sign in again.",
};

/** Plain text of a message, for quoting in replies and forwards. */
function plainText(m: OriginalMessage): string {
  if (m.text) return m.text;
  if (m.html) {
    // DOMParser builds an inert document: nothing runs and no images load.
    return new DOMParser().parseFromString(m.html, "text/html").body.textContent ?? "";
  }
  return "";
}

const emailsIn = (raw: string): string[] =>
  raw
    .split(",")
    .map((p) => (p.match(/<([^>]+)>/)?.[1] ?? p).trim().toLowerCase())
    .filter(Boolean);

function startingValues(req: ComposeRequest, me: string) {
  const o = req.original;
  if (!o || req.mode === "new") return { to: "", cc: "", subject: "", body: "" };

  const when = new Date(o.date).toLocaleString();
  const text = plainText(o).trim().slice(0, 4000);

  if (req.mode === "forward") {
    return {
      to: "",
      cc: "",
      subject: /^fwd?:/i.test(o.subject) ? o.subject : `Fwd: ${o.subject}`,
      body:
        `\n\n---------- Forwarded message ---------\nFrom: ${o.from} <${o.fromEmail}>\n` +
        `Date: ${when}\nSubject: ${o.subject}\nTo: ${o.to}\n\n${text}`,
    };
  }

  const replyTo = o.replyTo || o.fromEmail;
  const quoted = text.split("\n").map((l) => `> ${l}`).join("\n");
  let cc = "";
  if (req.mode === "replyAll") {
    const skip = new Set([me.toLowerCase(), ...emailsIn(replyTo)]);
    cc = [...emailsIn(o.to), ...emailsIn(o.cc)].filter((e) => !skip.has(e)).join(", ");
  }
  return {
    to: replyTo,
    cc,
    subject: /^re:/i.test(o.subject) ? o.subject : `Re: ${o.subject}`,
    body: `\n\nOn ${when}, ${o.from} <${o.fromEmail}> wrote:\n${quoted}`,
  };
}

const TITLES = { new: "New message", reply: "Reply", replyAll: "Reply all", forward: "Forward" };

export function ComposeDialog({
  request,
  me,
  onClose,
  onSent,
}: {
  request: ComposeRequest;
  me: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [init] = useState(() => startingValues(request, me));
  const [to, setTo] = useState(init.to);
  const [cc, setCc] = useState(init.cc);
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(init.cc !== "");
  const [subject, setSubject] = useState(init.subject);
  const [body, setBody] = useState(init.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const o = request.original;
  const isReply = request.mode === "reply" || request.mode === "replyAll";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc,
          bcc,
          subject,
          body,
          ...(o && request.mode !== "new"
            ? {
                inReplyTo: isReply ? o.messageId : undefined,
                references: isReply
                  ? [o.references, o.messageId].filter(Boolean).join(" ")
                  : undefined,
                threadId: isReply ? o.threadId : undefined,
              }
            : {}),
        }),
      });
      if (res.ok) return onSent();
      const data = await res.json().catch(() => ({}));
      setError(ERRORS[data.error] ?? "Couldn't send that message. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="compose" role="dialog" aria-label={TITLES[request.mode]}>
      <form onSubmit={send}>
        <div className="compose-head">
          <span>{TITLES[request.mode]}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="compose-field">
          <label htmlFor="c-to">To</label>
          <input
            id="c-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            autoFocus={!isReply}
            autoComplete="off"
            placeholder="name@example.com"
          />
          {!showCc && (
            <button type="button" className="btn-link" onClick={() => setShowCc(true)}>
              Cc / Bcc
            </button>
          )}
        </div>
        {showCc && (
          <>
            <div className="compose-field">
              <label htmlFor="c-cc">Cc</label>
              <input id="c-cc" value={cc} onChange={(e) => setCc(e.target.value)} autoComplete="off" />
            </div>
            <div className="compose-field">
              <label htmlFor="c-bcc">Bcc</label>
              <input id="c-bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} autoComplete="off" />
            </div>
          </>
        )}
        <div className="compose-field">
          <label htmlFor="c-subject">Subject</label>
          <input
            id="c-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={500}
          />
        </div>

        <textarea
          className="compose-body"
          aria-label="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          autoFocus={isReply}
          onFocus={(e) => {
            // Start above the quoted text when replying or forwarding.
            if (isReply || request.mode === "forward") e.currentTarget.setSelectionRange(0, 0);
          }}
        />

        {error && (
          <p className="compose-error" role="alert">
            {error}
          </p>
        )}
        <div className="compose-foot">
          <button className="btn btn-filled" type="submit" disabled={sending}>
            <Icon name="send" size={18} />
            {sending ? "Sending…" : "Send"}
          </button>
          <button className="btn btn-text" type="button" onClick={onClose}>
            Discard
          </button>
        </div>
      </form>
    </div>
  );
}
