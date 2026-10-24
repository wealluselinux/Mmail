"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export type AccountInfo = {
  google_sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

const MAX_ACCOUNTS = 5;

function Face({ a, size = 40 }: { a: AccountInfo; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {a.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.picture} alt="" referrerPolicy="no-referrer" />
      ) : (
        (a.name ?? a.email)[0].toUpperCase()
      )}
    </span>
  );
}

/** Avatar button with a menu to switch between, add, and sign out of Google accounts. */
export function AccountMenu({
  accounts,
  activeSub,
}: {
  accounts: AccountInfo[];
  activeSub: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = accounts.find((a) => a.google_sub === activeSub) ?? accounts[0];
  if (!active) return null;

  async function post(url: string, sub: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub }),
      });
      const data = await res.json().catch(() => ({}));
      // A full reload so every pane starts fresh for the new account.
      window.location.assign(data.empty ? "/" : "/mail");
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="account-menu">
      <button
        className="avatar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={active.email}
      >
        <Face a={active} />
      </button>

      {open && (
        <>
          <div className="scrim clear" onClick={() => setOpen(false)} />
          <div className="menu" role="menu">
            <div className="menu-current">
              <Face a={active} size={48} />
              <div>
                <strong>{active.name ?? active.email}</strong>
                <span>{active.email}</span>
              </div>
            </div>

            {accounts
              .filter((a) => a.google_sub !== active.google_sub)
              .map((a) => (
                <div key={a.google_sub} className="menu-row">
                  <button
                    role="menuitem"
                    className="menu-item"
                    disabled={busy}
                    onClick={() => post("/api/accounts/switch", a.google_sub)}
                  >
                    <Face a={a} size={32} />
                    <span className="menu-text">
                      <strong>{a.name ?? a.email}</strong>
                      <span>{a.email}</span>
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    title={`Sign out ${a.email}`}
                    aria-label={`Sign out ${a.email}`}
                    disabled={busy}
                    onClick={() => post("/api/accounts/remove", a.google_sub)}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ))}

            {accounts.length < MAX_ACCOUNTS ? (
              // A plain link: this starts a full-page Google sign-in.
              <a className="menu-item" role="menuitem" href="/api/auth/google">
                <span className="menu-plus">
                  <Icon name="add" size={20} />
                </span>
                <span className="menu-text">Add another account</span>
              </a>
            ) : (
              <p className="menu-note">You can link up to {MAX_ACCOUNTS} accounts.</p>
            )}

            <div className="menu-divider" />
            <button
              role="menuitem"
              className="menu-item"
              disabled={busy}
              onClick={() => post("/api/accounts/remove", active.google_sub)}
            >
              <span className="menu-plus">
                <Icon name="logout" size={20} />
              </span>
              <span className="menu-text">Sign out of {active.email}</span>
            </button>
            {accounts.length > 1 && (
              <form action="/api/auth/logout" method="post">
                <button role="menuitem" className="menu-item" type="submit">
                  <span className="menu-plus">
                    <Icon name="logout" size={20} />
                  </span>
                  <span className="menu-text">Sign out of all accounts</span>
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
