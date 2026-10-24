import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export const REPO_URL = "https://github.com/wealluselinux/Mmail";
export const ISSUES_URL = `${REPO_URL}/issues`;
export const UPDATED = "October 24, 2026";

export function LegalFooter() {
  return (
    <footer className="footer">
      <nav className="footer-links" aria-label="Legal">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
      <p>
        Material Mail is free and open source. It is an independent project and is not affiliated
        with, endorsed by, or sponsored by Google. Gmail and Google are trademarks of Google LLC.
      </p>
    </footer>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="landing">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="mail" size={22} />
          </span>
          Material Mail
        </Link>
        <Link href="/login" className="btn btn-tonal">
          Sign in
        </Link>
      </header>
      <main className="legal">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
