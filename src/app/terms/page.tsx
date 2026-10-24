import { ISSUES_URL, LegalPage, REPO_URL } from "@/components/LegalPage";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Material Mail",
  description: "The terms for using Material Mail.",
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply to your use of Material Mail, a free, open-source email client for Gmail.
        By signing in or using the app you agree to them. If you don&rsquo;t agree, please don&rsquo;t
        use the app.
      </p>

      <h2>What Material Mail is</h2>
      <p>
        Material Mail is an independent interface for your own Gmail account. It does not provide
        email addresses or host your mail; your messages stay in Gmail. It is not affiliated with,
        endorsed by, or sponsored by Google. Gmail and Google are trademarks of Google LLC.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You sign in with a Google account, and you must be allowed to use it.</li>
        <li>You are responsible for activity on your account and for keeping your devices secure.</li>
        <li>
          Your use of Gmail remains subject to{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
            Google&rsquo;s Terms of Service
          </a>
          .
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to use Material Mail to:</p>
      <ul>
        <li>send spam, phishing, malware, or unlawful, harassing, or deceptive messages;</li>
        <li>break the law or violate anyone&rsquo;s rights;</li>
        <li>attempt to disrupt, overload, or gain unauthorized access to the service or other people&rsquo;s accounts;</li>
        <li>circumvent security features or abuse Google&rsquo;s services through the app.</li>
      </ul>
      <p>
        We may limit or block access to protect the service or its users, or if these terms are
        broken.
      </p>

      <h2>Your content</h2>
      <p>
        You keep all rights to your emails, wallpapers, and other content. You give Material Mail
        only the permission needed to display, organize, and send them on your behalf as you
        instruct. How we handle your data is described in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Open source</h2>
      <p>
        The source code is available under the MIT License at{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          {REPO_URL.replace("https://", "")}
        </a>
        . These terms govern use of the hosted service, not your rights to the code under that
        license.
      </p>

      <h2>No warranty</h2>
      <p>
        Material Mail is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>,
        free of charge, without warranties of any kind, whether express or implied, including
        merchantability, fitness for a particular purpose, and non-infringement. We don&rsquo;t
        promise that the service will be uninterrupted, error-free, or that messages will always
        load or send successfully. Keep important mail safe in Gmail, which remains the source of
        truth.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Material Mail and its contributors are not liable for
        any indirect, incidental, special, or consequential damages, or for lost data, profits, or
        messages, arising from your use of the service. Because the service is free, our total
        liability for any claim is limited to zero dollars (US$0) where the law allows.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Material Mail at any time by signing out and revoking access in your{" "}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
          Google account permissions
        </a>
        . We may suspend or discontinue the service, or any part of it, at any time.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. Continuing to use Material Mail after a change
        means you accept the updated terms. The &ldquo;Last updated&rdquo; date shows the latest
        revision.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Open an issue at{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          {ISSUES_URL.replace("https://", "")}
        </a>
        .
      </p>
    </LegalPage>
  );
}
