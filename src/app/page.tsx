import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LegalFooter, REPO_URL } from "@/components/LegalPage";

export default function Home() {
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

      <main className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Free and open source</span>
          <h1>
            Gmail, <em>redesigned</em> with Material You.
          </h1>
          <p>
            Material Mail is a calm, beautiful email client for your Gmail account. No ads, no
            clutter, just your mail in a design that feels like your phone.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-filled">
              Get started
            </Link>
            <a href={REPO_URL} className="btn btn-text" target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>

          <div className="features">
            <div className="feature">
              <h3>Zero ads</h3>
              <p>Your inbox is yours. Nothing is sold, promoted, or tracked.</p>
            </div>
            <div className="feature">
              <h3>Material You</h3>
              <p>Soft shapes and tonal color that follow Material Design 3.</p>
            </div>
            <div className="feature">
              <h3>Still Gmail</h3>
              <p>Sign in with Google. Your mail never leaves your Gmail account.</p>
            </div>
          </div>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
