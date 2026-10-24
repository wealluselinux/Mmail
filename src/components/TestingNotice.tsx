import { ISSUES_URL } from "./LegalPage";

/** Explains the Google "unverified app" screen people will see while the app is in testing. */
export function TestingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`notice${compact ? " compact" : ""}`} aria-labelledby="testing-title">
      <h2 id="testing-title">Material Mail is in testing</h2>
      <p>
        Google hasn&rsquo;t finished reviewing this app, so it only lets approved testers sign in.
        After you press <strong>Sign in with Google</strong>, Google will show a warning like
        &ldquo;Google hasn&rsquo;t verified this app&rdquo;. That&rsquo;s expected for an app that is
        still being tested.
      </p>
      <p>
        <strong>Don&rsquo;t press Back to safety if you want to use the app.</strong> Choose{" "}
        <strong>Continue</strong> (or <strong>Advanced</strong>, then{" "}
        <strong>Go to Material Mail</strong>). Only do this if you trust this project. The code is
        open source, and you can sign out and revoke access at any time.
      </p>
      {!compact && (
        <ul>
          <li>
            If Google says <strong>&ldquo;Access blocked&rdquo;</strong>, your Google account
            isn&rsquo;t on the tester list yet.{" "}
            <a href={ISSUES_URL} target="_blank" rel="noreferrer">
              Ask for access on GitHub
            </a>{" "}
            (leave your email out of the public post; we&rsquo;ll tell you how to share it).
          </li>
          <li>While in testing, Google signs you out after about 7 days. Just sign in again.</li>
        </ul>
      )}
    </aside>
  );
}
