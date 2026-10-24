import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LandingTheme } from "@/components/LandingTheme";
import { LegalFooter, REPO_URL } from "@/components/LegalPage";

const MAIL = [
  { from: "Northwind Bank", subject: "Your October statement is ready", time: "9:41", tone: "p", unread: true },
  { from: "Dana Whitfield", subject: "Re: dinner on Saturday?", time: "8:15", tone: "t", unread: true },
  { from: "Paperplane Travel", subject: "Your boarding pass for Friday", time: "Mon", tone: "s", unread: false },
  { from: "Linden Library", subject: "Your hold is ready for pickup", time: "Sun", tone: "p", unread: false },
];

function MailPreview() {
  return (
    <div className="l-stage" aria-hidden="true">
      <div className="l-mock">
        <div className="l-mock-bar">
          <span className="l-dot" />
          <span className="l-dot" />
          <span className="l-dot" />
          <span className="l-mock-search">Search mail</span>
        </div>
        <div className="l-mock-body">
          <ul className="l-mock-nav">
            <li className="on">Inbox <b>4</b></li>
            <li>Starred</li>
            <li>Sent</li>
            <li>Receipts</li>
            <li>Travel</li>
          </ul>
          <ul className="l-mock-list">
            {MAIL.map((m) => (
              <li key={m.from} className={m.unread ? "unread" : ""}>
                <span className={`l-logo ${m.tone}`}>{m.from[0]}</span>
                <span className="l-mock-text">
                  <strong>{m.from}</strong>
                  <span>{m.subject}</span>
                </span>
                <time>{m.time}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="l-widget l-clock">
        <span className="l-hand h" />
        <span className="l-hand m" />
        <span className="l-pin" />
      </div>
      <div className="l-widget l-weather">
        <strong>18°</strong>
        <span>Hazel Park</span>
      </div>
    </div>
  );
}

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
        <nav className="l-nav" aria-label="Main">
          <a href="#features">Features</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <Link href="/login" className="btn btn-tonal">
          Sign in
        </Link>
      </header>

      <main>
        <section className="l-hero">
          <div className="l-hero-copy">
            <h1>Gmail, in the shape of Material You.</h1>
            <p>
              A free, open-source email app with no ads. Sign in with Google and your inbox looks
              the way you want, down to the colors in your wallpaper.
            </p>
            <div className="l-actions">
              <Link href="/login" className="btn btn-filled">
                Sign in with Google
              </Link>
              <a href="#trust" className="btn btn-text">
                How your data is handled
              </a>
            </div>
            <p className="l-agree">
              By signing in you agree to the <Link href="/terms">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <LandingTheme />
          </div>
          <MailPreview />
        </section>

        <section id="features" className="l-section">
          <h2>Everything Gmail does, in your style</h2>
          <div className="l-bento">
            <article className="l-tile t1">
              <h3>Your colors, your wallpaper</h3>
              <p>
                Pick one color, or upload a picture and Material Mail builds the whole palette from
                it. Light, dark, or follow your device.
              </p>
            </article>
            <article className="l-tile t2">
              <h3>Widgets you can move</h3>
              <p>Clock, weather, calendar, a note. Drag them anywhere on your home screen.</p>
            </article>
            <article className="l-tile t3">
              <h3>Every Gmail label</h3>
              <p>Inbox, categories, and your own labels, with unread counts and sender logos.</p>
            </article>
            <article className="l-tile t4">
              <h3>Up to five accounts</h3>
              <p>Switch between Google accounts from your avatar. Each one keeps its own look.</p>
            </article>
            <article className="l-tile t5">
              <h3>Write, reply, forward</h3>
              <p>Compose from anywhere and reply in the same thread.</p>
            </article>
          </div>
        </section>

        <section id="trust" className="l-section l-trust">
          <div className="l-trust-copy">
            <h2>Your mail stays in Gmail</h2>
            <p>
              Material Mail never copies your messages into a database, never shows ads, and never
              sells your data. It stores your sign-in token encrypted, plus your color and widget
              settings. That&rsquo;s all.
            </p>
            <p>
              Don&rsquo;t take our word for it: the policies are written in plain language, and the
              code is public.
            </p>
          </div>
          <div className="l-links">
            <Link href="/privacy" className="l-link">
              <span>
                <strong>Privacy Policy</strong>
                <span>What we access, what we store, and how to delete it.</span>
              </span>
              <Icon name="chevronRight" />
            </Link>
            <Link href="/terms" className="l-link">
              <span>
                <strong>Terms of Service</strong>
                <span>The rules for using Material Mail.</span>
              </span>
              <Icon name="chevronRight" />
            </Link>
            <a href={REPO_URL} className="l-link" target="_blank" rel="noreferrer">
              <span>
                <strong>Source code on GitHub</strong>
                <span>Free and open source under the MIT license.</span>
              </span>
              <Icon name="chevronRight" />
            </a>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
