import { ISSUES_URL, LegalPage, REPO_URL } from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy · Material Mail",
  description: "How Material Mail handles your Google account and Gmail data.",
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Material Mail (&ldquo;Material Mail&rdquo;, &ldquo;we&rdquo;, &ldquo;the app&rdquo;) is a
        free, open-source email client that gives your existing Gmail account a Material You
        design. This policy explains what data the app accesses, what it stores, who it is shared
        with, and the choices you have. The full source code is public at{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          {REPO_URL.replace("https://", "")}
        </a>
        , so you can verify everything described here.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Material Mail does not sell your data, show ads, or use your data for advertising.</li>
        <li>
          Your emails are never copied into our database. They are fetched from Gmail when you open
          them and shown to you.
        </li>
        <li>
          We store only your basic Google profile, an encrypted sign-in token, and your appearance
          settings.
        </li>
        <li>You can disconnect Material Mail from your Google account at any time.</li>
      </ul>

      <h2>Data we access from your Google account</h2>
      <p>When you sign in with Google and grant permission, Material Mail can access:</p>
      <ul>
        <li>
          <strong>Your profile:</strong> your name, email address, and profile picture, used to
          identify your account and show who is signed in.
        </li>
        <li>
          <strong>Your Gmail messages and labels</strong> (scope <code>gmail.modify</code>): to
          list, search, and display your mail and labels, and to carry out actions you choose, such
          as marking read or unread, starring, archiving, and moving to trash.
        </li>
        <li>
          <strong>Sending mail</strong> (scope <code>gmail.send</code>): to send messages, replies,
          and forwards that you write and choose to send. Nothing is sent unless you press Send.
        </li>
      </ul>
      <p>
        We request only what the features above need. We do not read your mail for any purpose other
        than showing it to you and performing the actions you ask for.
      </p>

      <h2>Data we store</h2>
      <p>The following is saved in our database (hosted on Supabase):</p>
      <ul>
        <li>Your Google account ID, email address, name, and profile picture URL.</li>
        <li>
          A Google <em>refresh token</em>, encrypted with AES-256-GCM before it is stored. It lets
          the app reach your Gmail on your behalf without asking you to sign in every time. The
          encryption key is kept separately from the database.
        </li>
        <li>
          Your preferences: theme, accent color, widget and top bar choices, widget positions, your
          note, and your chosen weather city.
        </li>
        <li>The wallpaper image, if you upload one.</li>
      </ul>
      <p>
        <strong>We do not store the content of your emails</strong> (subjects, bodies, attachments,
        contacts, or addresses of people you correspond with). Message data passes through our server
        only to be delivered to your browser, and it is not logged or saved.
      </p>

      <h2>Cookies</h2>
      <p>
        Material Mail uses only essential cookies: a signed, HttpOnly session cookie that keeps you
        signed in (including which linked accounts are in this browser), a preferences cookie that
        lets your theme load without flashing, and short-lived cookies used during the Google
        sign-in handshake. There are no advertising or analytics cookies.
      </p>

      <h2>Who we share data with</h2>
      <p>We do not sell, rent, or trade your data. It is processed only by the services needed to run the app:</p>
      <ul>
        <li>
          <strong>Google</strong>, to sign you in and to read and send your Gmail through the Gmail
          API.
        </li>
        <li>
          <strong>Supabase</strong>, which hosts the database described above.
        </li>
        <li>
          <strong>Render</strong>, which hosts the application servers.
        </li>
        <li>
          <strong>Open-Meteo</strong>, a weather service with no account required. Only the
          coordinates of the city you select for the weather widget are sent to it.
        </li>
        <li>
          <strong>Favicon services</strong> (Google&rsquo;s favicon service, with DuckDuckGo as a
          fallback), used by our server to look up a sender&rsquo;s brand logo. Only the sender&rsquo;s
          website domain (for example <code>cash.app</code>) is sent, never your email address or
          message content, and requests come from our server rather than your browser.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law, or to protect the security of the
        service.
      </p>

      <h2>Google API Services User Data Policy</h2>
      <p>
        Material Mail&rsquo;s use and transfer to any other app of information received from Google
        APIs will adhere to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. In particular:
      </p>
      <ul>
        <li>
          Google user data is used only to provide and improve the user-facing email features
          described in this policy.
        </li>
        <li>It is not transferred to others except as needed to provide those features, to comply with law, or as part of a merger or sale with your consent.</li>
        <li>It is not used to serve ads, including retargeted, personalized, or interest-based ads.</li>
        <li>
          Humans do not read your data unless you give explicit permission for specific messages,
          it is necessary for security or to investigate abuse, or the law requires it.
        </li>
        <li>It is not used to develop, improve, or train generalized AI or machine-learning models.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Refresh tokens are encrypted at rest. Sessions use signed, HttpOnly cookies over HTTPS.
        Sign-in uses the OAuth 2.0 authorization code flow with PKCE. Message HTML is displayed in a
        sandbox with scripts disabled, and remote images in emails are blocked until you choose to
        show them. No system is perfectly secure, but we take reasonable measures to protect your
        information.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep your account data for as long as you use Material Mail. You can:
      </p>
      <ul>
        <li>
          <strong>Sign out</strong> at any time from the account menu. This removes the session
          cookie from your browser.
        </li>
        <li>
          <strong>Revoke access</strong> at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          . Once revoked, the stored token stops working immediately.
        </li>
        <li>
          <strong>Ask us to delete your data</strong> (profile, encrypted token, preferences, and
          wallpaper) by opening an issue at{" "}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            our GitHub issue tracker
          </a>
          . Please do not post private information there; we will tell you how to verify your
          account privately. Requests are handled promptly.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        Material Mail is not directed to children under 13, and we do not knowingly collect
        information from them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the app changes. The &ldquo;Last updated&rdquo; date above shows
        the latest revision, and the full history is public in the project&rsquo;s repository.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Open an issue at{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          {ISSUES_URL.replace("https://", "")}
        </a>
        .
      </p>
    </LegalPage>
  );
}
