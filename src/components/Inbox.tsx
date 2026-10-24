"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountMenu, type AccountInfo } from "./AccountMenu";
import { ComposeDialog, type ComposeRequest } from "./ComposeDialog";
import { Icon, type IconName } from "./Icon";
import { usePrefs } from "./PrefsProvider";
import { SenderAvatar } from "./SenderAvatar";
import { WidgetCanvas, WidgetStack, type WidgetActions } from "./widgets";
import { enabledKeys } from "@/lib/layout";

type Summary = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
};

type Detail = Summary & {
  to: string;
  cc: string;
  replyTo: string;
  messageId: string;
  references: string;
  html: string | null;
  text: string | null;
};

type LabelInfo = {
  id: string;
  name: string;
  kind: "system" | "category" | "user";
  unread: number;
  total: number;
};

type Folder = { id: string; label: string; icon: IconName };

const SYSTEM_FOLDERS: Folder[] = [
  { id: "INBOX", label: "Inbox", icon: "inbox" },
  { id: "STARRED", label: "Starred", icon: "star" },
  { id: "IMPORTANT", label: "Important", icon: "important" },
  { id: "SENT", label: "Sent", icon: "send" },
  { id: "DRAFT", label: "Drafts", icon: "draft" },
  { id: "ALL", label: "All Mail", icon: "mail" },
  { id: "SPAM", label: "Spam", icon: "spam" },
  { id: "TRASH", label: "Trash", icon: "delete" },
];

const CATEGORY_FOLDERS: Folder[] = [
  { id: "CATEGORY_PERSONAL", label: "Primary", icon: "person" },
  { id: "CATEGORY_SOCIAL", label: "Social", icon: "group" },
  { id: "CATEGORY_PROMOTIONS", label: "Promotions", icon: "label" },
  { id: "CATEGORY_UPDATES", label: "Updates", icon: "info" },
  { id: "CATEGORY_FORUMS", label: "Forums", icon: "forum" },
];

const CHAT_FOLDER: Folder = { id: "CHAT", label: "Chats", icon: "chat" };

/** Folders where "archive" makes no sense. */
const NO_ARCHIVE = new Set(["SENT", "DRAFT", "TRASH"]);

type User = { sub: string; email: string; name: string | null; picture: string | null };

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

function NavItem({
  folder,
  active,
  badge,
  onClick,
}: {
  folder: Folder;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className="nav-item" aria-current={active} onClick={onClick}>
      <Icon name={folder.icon} />
      <span className="nav-label">{folder.label}</span>
      {!!badge && <span className="nav-badge">{badge > 999 ? "999+" : badge}</span>}
    </button>
  );
}

export function Inbox({ user, accounts }: { user: User; accounts: AccountInfo[] }) {
  const router = useRouter();
  const { prefs, update } = usePrefs();
  const hasWidgets = enabledKeys(prefs).length > 0;

  const [mailbox, setMailbox] = useState<string>("INBOX");
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

  const [labels, setLabels] = useState<LabelInfo[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [compose, setCompose] = useState<{ req: ComposeRequest; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (status: number) => {
      if (status === 401) {
        router.push("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  // Labels (with counts) load on start and refresh every two minutes.
  const loadLabels = useCallback(() => {
    fetch("/api/mail/labels")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLabels(d.labels))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadLabels();
    const id = setInterval(loadLabels, 120_000);
    return () => clearInterval(id);
  }, [loadLabels]);

  // Load the message list whenever the folder, search, or reload key changes.
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

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  /** Opens a folder (or the Home board), optionally with a search already applied. */
  function go(next: string, q = "") {
    setLoading(next !== "HOME");
    setMessages([]);
    setNextPage(null);
    setSelectedId(null);
    setDetail(null);
    setError(null);
    setMailbox(next);
    setQuery(q);
    setActiveQuery(q);
    setNavOpen(false);
    setEditing(false);
  }

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
    loadLabels();
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
      void patch(id, "read").then(loadLabels);
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
      loadLabels();
    } else {
      setError("That didn't work. Please try again.");
    }
  }

  async function markUnread(id: string) {
    if (await patch(id, "unread")) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: true } : m)));
      setSelectedId(null);
      setDetail(null);
      loadLabels();
    }
  }

  const openCompose = useCallback(
    (req: ComposeRequest) => setCompose({ req, key: Date.now() }),
    [],
  );

  const actions: WidgetActions = useMemo(
    () => ({
      openInbox: () => go("INBOX"),
      search: (q) => go("ALL", q),
      compose: () => openCompose({ mode: "new" }),
    }),
    // go() only sets state, so it is safe to omit
    [openCompose],
  );

  const srcDoc = useMemo(
    () => (detail ? buildSrcDoc(detail, loadImages) : ""),
    [detail, loadImages],
  );

  const countOf = (id: string) => labels.find((l) => l.id === id);
  const hasChats = (countOf("CHAT")?.total ?? 0) > 0;
  const systemFolders = hasChats
    ? [...SYSTEM_FOLDERS.slice(0, 5), CHAT_FOLDER, ...SYSTEM_FOLDERS.slice(5)]
    : SYSTEM_FOLDERS;
  const userLabels = labels.filter((l) => l.kind === "user").sort((a, b) => a.name.localeCompare(b.name));

  const folderLabel =
    mailbox === "HOME"
      ? "Home"
      : ([...SYSTEM_FOLDERS, ...CATEGORY_FOLDERS, CHAT_FOLDER].find((f) => f.id === mailbox)?.label ??
        userLabels.find((l) => l.id === mailbox)?.name ??
        "Mail");

  const showDock = prefs.dock && hasWidgets && mailbox !== "HOME";
  const badgeFor = (id: string) => {
    const l = countOf(id);
    if (!l) return undefined;
    return id === "DRAFT" ? l.total : l.unread;
  };

  return (
    <div className={`app${showDock ? " has-dock" : ""}`}>
      <header className="app-top">
        <button
          className="icon-btn only-narrow"
          onClick={() => setNavOpen((o) => !o)}
          aria-label="Menu"
          title="Menu"
        >
          <Icon name="menu" />
        </button>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="mail" size={22} />
          </span>
          <span className="brand-name">Material Mail</span>
        </div>

        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go(mailbox === "HOME" ? "ALL" : mailbox, query.trim());
          }}
        >
          <Icon name="search" size={22} />
          <input
            type="search"
            placeholder={mailbox === "HOME" ? "Search mail" : `Search ${folderLabel.toLowerCase()}`}
            aria-label="Search mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="account">
          <Link href="/customize" className="icon-btn" title="Customize" aria-label="Customize">
            <Icon name="settings" />
          </Link>
          <AccountMenu accounts={accounts} activeSub={user.sub} />
        </div>
      </header>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <nav className={`nav${navOpen ? " open" : ""}`} aria-label="Mailboxes">
        <button className="compose-fab" onClick={() => openCompose({ mode: "new" })}>
          <Icon name="edit" />
          <span>Compose</span>
        </button>

        {hasWidgets && (
          <NavItem
            folder={{ id: "HOME", label: "Home", icon: "home" }}
            active={mailbox === "HOME"}
            onClick={() => go("HOME")}
          />
        )}
        {systemFolders.map((f) => (
          <NavItem
            key={f.id}
            folder={f}
            active={mailbox === f.id}
            badge={badgeFor(f.id)}
            onClick={() => go(f.id)}
          />
        ))}

        <details className="nav-group" open={CATEGORY_FOLDERS.some((f) => f.id === mailbox) || undefined}>
          <summary>Categories</summary>
          {CATEGORY_FOLDERS.map((f) => (
            <NavItem
              key={f.id}
              folder={f}
              active={mailbox === f.id}
              badge={badgeFor(f.id)}
              onClick={() => go(f.id)}
            />
          ))}
        </details>

        <div className="nav-heading">Labels</div>
        {userLabels.length === 0 && <p className="nav-empty">No labels yet</p>}
        {userLabels.map((l) => (
          <NavItem
            key={l.id}
            folder={{ id: l.id, label: l.name, icon: "label" }}
            active={mailbox === l.id}
            badge={l.unread}
            onClick={() => go(l.id)}
          />
        ))}
      </nav>

      {mailbox === "HOME" ? (
        <section className="pane pane-board" aria-label="Home">
          <div className="pane-head">
            <span>Home</span>
            <span className="pane-tools">
              {editing && (
                <button className="btn btn-text" onClick={() => update({ layout: {} })}>
                  Reset layout
                </button>
              )}
              <button
                className={`btn ${editing ? "btn-filled" : "btn-tonal"}`}
                style={{ height: 40 }}
                onClick={() => setEditing((e) => !e)}
              >
                <Icon name={editing ? "check" : "move"} size={18} />
                {editing ? "Done" : "Rearrange"}
              </button>
            </span>
          </div>
          <div className="board">
            <WidgetCanvas
              prefs={prefs}
              actions={actions}
              editing={editing}
              onMove={(key, pos) => update((p) => ({ layout: { ...p.layout, [key]: pos } }))}
            />
          </div>
        </section>
      ) : (
        <>
          <section className={`pane pane-list${selectedId ? " hidden" : ""}`} aria-label="Messages">
            <div className="pane-head">
              <span>{activeQuery ? `Results for “${activeQuery}”` : folderLabel}</span>
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
                  <SenderAvatar name={m.from} email={m.fromEmail} />
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
                  <div className="reader-actions">
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
                    <button
                      className="icon-btn"
                      onClick={() => openCompose({ mode: "reply", original: detail })}
                      title="Reply"
                      aria-label="Reply"
                    >
                      <Icon name="reply" />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => openCompose({ mode: "replyAll", original: detail })}
                      title="Reply all"
                      aria-label="Reply all"
                    >
                      <Icon name="replyAll" />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => openCompose({ mode: "forward", original: detail })}
                      title="Forward"
                      aria-label="Forward"
                    >
                      <Icon name="forward" />
                    </button>
                    <span className="reader-actions-gap" />
                    {!NO_ARCHIVE.has(mailbox) && (
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
                    <SenderAvatar key={detail.id} name={detail.from} email={detail.fromEmail} />
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

          {showDock && (
            <aside className="pane pane-dock" aria-label="Widgets">
              <div className="pane-head">
                <span>Widgets</span>
              </div>
              <WidgetStack prefs={prefs} actions={actions} />
            </aside>
          )}
        </>
      )}

      {compose && (
        <ComposeDialog
          key={compose.key}
          request={compose.req}
          me={user.email}
          onClose={() => setCompose(null)}
          onSent={() => {
            setCompose(null);
            setToast("Message sent");
            if (mailbox === "SENT") reload();
          }}
        />
      )}
      {toast && (
        <div className="snackbar" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
