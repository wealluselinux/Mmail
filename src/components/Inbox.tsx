"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { usePrefs } from "./PrefsProvider";
import { WidgetBoard } from "./widgets";

type Summary = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
};

type Detail = Summary & { to: string; html: string | null; text: string | null };

type MailFolder = "INBOX" | "STARRED" | "SENT" | "DRAFT" | "SPAM" | "TRASH";
/** HOME is the widget board, not a Gmail folder. */
type Mailbox = MailFolder | "HOME";

const NAV: { id: MailFolder; label: string; icon: IconName }[] = [
  { id: "INBOX", label: "Inbox", icon: "inbox" },
  { id: "STARRED", label: "Starred", icon: "star" },
  { id: "SENT", label: "Sent", icon: "send" },
  { id: "DRAFT", label: "Drafts", icon: "draft" },
  { id: "SPAM", label: "Spam", icon: "spam" },
  { id: "TRASH", label: "Trash", icon: "delete" },
];

type User = { email: string; name: string | null; picture: string | null };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** True if the message HTML references remote images (which may be tracking pixels). */
function hasRemoteImages(html: string | null): boolean {
  return !!html && /<img[^>]+src=["']?https?:/i.test(html);
}

/**
 * Builds the sandboxed document for the reading pane. Scripts never run, and
 * remote images are blocked by CSP until the reader opts in (no tracking pixels).
 */
function buildSrcDoc(detail: Detail, loadImages: boolean): string {
  const csp = [
    "default-src 'none'",
    `img-src data: ${loadImages ? "https: http:" : ""}`,
    "style-src 'unsafe-inline'",
  ].join("; ");
  const body = detail.html ?? `<pre>${escapeHtml(detail.text ?? "(This message has no content.)")}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:20px;font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d1b20;background:#fff;overflow-wrap:anywhere}
  pre{white-space:pre-wrap;font:inherit;margin:0}
  img{max-width:100%;height:auto}
  a{color:#6750a4}
</style></head><body>${body}</body></html>`;
}

export function Inbox({ user }: { user: User }) {
  const router = useRouter();
  const { prefs } = usePrefs();
  const hasWidgets = Object.values(prefs.widgets).some(Boolean);
  const [mailbox, setMailbox] = useState<Mailbox>("INBOX");
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [messages, setMessages] = useState<Summary[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadImages, setLoadImages] = useState(false);

  const handleAuthError = useCallback((status: number) => {
    if (status === 401) {
      router.push("/login");
      return true;
    }
    return false;
  }, [router]);

  // Load the message list whenever the mailbox, search, or reload key changes.
  useEffect(() => {
    if (mailbox === "HOME") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ mailbox });
    if (activeQuery) params.set("q", activeQuery);

    fetch(`/api/mail?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (handleAuthError(res.status)) return;
        if (!res.ok) throw new Error("Couldn't load your mail. Please try again.");
        const data = await res.json();
        setMessages(data.messages);
        setNextPage(data.nextPageToken);
        setError(null);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [mailbox, activeQuery, reloadKey, handleAuthError]);

  function switchMailbox(next: Mailbox) {
    setLoading(next !== "HOME");
    setMessages([]);
    setSelectedId(null);
    setDetail(null);
    setMailbox(next);
  }

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function loadMore() {
    if (!nextPage) return;
    const params = new URLSearchParams({ mailbox, pageToken: nextPage });
    if (activeQuery) params.set("q", activeQuery);
    const res = await fetch(`/api/mail?${params}`);
    if (handleAuthError(res.status)) return;
    if (!res.ok) return setError("Couldn't load more mail.");
    const data = await res.json();
    setMessages((prev) => [...prev, ...data.messages]);
    setNextPage(data.nextPageToken);
  }

  async function patch(id: string, action: string): Promise<boolean> {
    const res = await fetch(`/api/mail/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (handleAuthError(res.status)) return false;
    return res.ok;
  }

  async function open(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setLoadImages(false);
    setDetail(null);
    const res = await fetch(`/api/mail/${id}`);
    if (handleAuthError(res.status)) return;
    if (!res.ok) {
      setDetailLoading(false);
      return setError("Couldn't open that message.");
    }
    const data: Detail = await res.json();
    setDetail(data);
    setDetailLoading(false);
    if (data.unread) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
      void patch(id, "read");
    }
  }

  async function toggleStar(m: Summary | Detail) {
    const action = m.starred ? "unstar" : "star";
    const flip = (x: Summary) => (x.id === m.id ? { ...x, starred: !m.starred } : x);
    setMessages((prev) => prev.map(flip));
    setDetail((d) => (d && d.id === m.id ? { ...d, starred: !m.starred } : d));
    if (!(await patch(m.id, action))) setMessages((prev) => prev.map(flip));
  }

  async function remove(id: string, action: "archive" | "trash") {
    if (await patch(id, action)) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedId(null);
      setDetail(null);
    } else {
      setError("That didn't work. Please try again.");
    }
  }

  async function markUnread(id: string) {
    if (await patch(id, "unread")) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: true } : m)));
      setSelectedId(null);
      setDetail(null);
    }
  }

  const srcDoc = useMemo(
    () => (detail ? buildSrcDoc(detail, loadImages) : ""),
    [detail, loadImages],
  );
  const displayName = user.name ?? user.email;
  const mailboxLabel = mailbox === "HOME" ? "Home" : NAV.find((n) => n.id === mailbox)!.label;

  return (
    <div className="app">
      <header className="app-top">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="mail" size={22} />
          </span>
          <span className="nav-label">Mmail</span>
        </div>

        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (mailbox === "HOME") setMailbox("INBOX");
            setLoading(true);
            setSelectedId(null);
            setDetail(null);
            setActiveQuery(query.trim());
          }}
        >
          <Icon name="search" size={22} />
          <input
            type="search"
            placeholder={mailbox === "HOME" ? "Search mail" : `Search ${mailboxLabel.toLowerCase()}`}
            aria-label="Search mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="account">
          <span className="avatar" title={user.email}>
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt="" referrerPolicy="no-referrer" />
            ) : (
              initial(displayName)
            )}
          </span>
          <Link href="/customize" className="icon-btn" title="Customize" aria-label="Customize">
            <Icon name="settings" />
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="icon-btn" type="submit" title="Sign out" aria-label="Sign out">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </header>

      <nav className="nav" aria-label="Mailboxes">
        {hasWidgets && (
          <button
            className="nav-item"
            aria-current={mailbox === "HOME"}
            onClick={() => switchMailbox("HOME")}
          >
            <Icon name="home" />
            <span className="nav-label">Home</span>
          </button>
        )}
        {NAV.map((item) => (
          <button
            key={item.id}
            className="nav-item"
            aria-current={mailbox === item.id}
            onClick={() => switchMailbox(item.id)}
          >
            <Icon name={item.icon} />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {mailbox === "HOME" ? (
        <section className="pane pane-board" aria-label="Home">
          <div className="pane-head">
            <span>Home</span>
          </div>
          <WidgetBoard prefs={prefs} onOpenInbox={() => switchMailbox("INBOX")} />
        </section>
      ) : (
      <>
      <section className={`pane pane-list${selectedId ? " hidden" : ""}`} aria-label="Messages">
        <div className="pane-head">
          <span>{activeQuery ? `Results for “${activeQuery}”` : mailboxLabel}</span>
          <button className="icon-btn" onClick={reload} title="Refresh" aria-label="Refresh">
            <Icon name="refresh" />
          </button>
        </div>
        {error && (
          <div className="banner" role="alert">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        <div className="list">
          {loading && <div className="empty">Loading…</div>}
          {!loading && messages.length === 0 && !error && (
            <div className="empty">
              {activeQuery ? "No messages match your search." : "Nothing here yet."}
            </div>
          )}
          {messages.map((m) => (
            <button
              key={m.id}
              className={`row${m.unread ? " unread" : ""}`}
              aria-current={selectedId === m.id}
              onClick={() => open(m.id)}
            >
              <span className="avatar">{initial(m.from)}</span>
              <span className="row-from">{m.from}</span>
              <span className="row-date">{formatDate(m.date)}</span>
              <span className="row-subject">{m.subject}</span>
              <span className="row-snippet">{m.snippet}</span>
            </button>
          ))}
          {nextPage && !loading && (
            <button className="btn btn-tonal" style={{ margin: "12px auto" }} onClick={loadMore}>
              Load more
            </button>
          )}
        </div>
      </section>

      <section className={`pane pane-reader${selectedId ? "" : " closed"}`} aria-label="Message">
        {!selectedId && (
          <div className="empty">
            <div>
              <Icon name="mail" size={56} />
              <p>Select a message to read it</p>
            </div>
          </div>
        )}
        {selectedId && detailLoading && <div className="empty">Opening…</div>}
        {detail && (
          <div className="reader">
            <div className="reader-head">
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                <button
                  className="icon-btn only-narrow"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                  }}
                  title="Back"
                  aria-label="Back to list"
                >
                  <Icon name="back" />
                </button>
                {mailbox !== "TRASH" && mailbox !== "SENT" && mailbox !== "DRAFT" && (
                  <button
                    className="icon-btn"
                    onClick={() => remove(detail.id, "archive")}
                    title="Archive"
                    aria-label="Archive"
                  >
                    <Icon name="archive" />
                  </button>
                )}
                <button
                  className="icon-btn"
                  onClick={() => remove(detail.id, "trash")}
                  title="Move to trash"
                  aria-label="Move to trash"
                >
                  <Icon name="delete" />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => markUnread(detail.id)}
                  title="Mark as unread"
                  aria-label="Mark as unread"
                >
                  <Icon name="mail" />
                </button>
              </div>
              <h2>{detail.subject}</h2>
              <div className="reader-meta">
                <span className="avatar">{initial(detail.from)}</span>
                <div className="who">
                  <strong>{detail.from}</strong>
                  <span>
                    {detail.fromEmail} · {new Date(detail.date).toLocaleString()}
                  </span>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => toggleStar(detail)}
                  title={detail.starred ? "Remove star" : "Add star"}
                  aria-label={detail.starred ? "Remove star" : "Add star"}
                  style={detail.starred ? { color: "var(--md-primary)" } : undefined}
                >
                  <Icon name={detail.starred ? "star" : "starBorder"} />
                </button>
              </div>
            </div>
            {!loadImages && hasRemoteImages(detail.html) && (
              <div className="banner">
                Images are hidden to protect your privacy.
                <button onClick={() => setLoadImages(true)}>Show images</button>
              </div>
            )}
            <div className="reader-body">
              <iframe
                title={`Message: ${detail.subject}`}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                srcDoc={srcDoc}
              />
            </div>
          </div>
        )}
      </section>
      </>
      )}
    </div>
  );
}
