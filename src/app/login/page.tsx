import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleG, Icon } from "@/components/Icon";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Sign in · Mmail" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled. You need to allow access to continue.",
  missing_gmail_scope:
    "Mmail needs permission to read your Gmail. Please try again and tick the Gmail access box.",
  invalid_state: "That sign-in link expired. Please try again.",
  no_refresh_token: "Google didn't grant long-lived access. Please try again.",
  database_error: "Something went wrong saving your account. Please try again.",
  too_many_accounts: "You can link up to 5 accounts. Remove one first, then add another.",
  sign_in_failed: "Sign-in failed. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // If we can't reach the database (e.g. missing config), still show the page.
  const user = await getSessionUser().catch(() => null);
  const { error } = await searchParams;
  // Signed-in visitors go to their mail, unless they were sent here to see an error
  // (for example after trying to add an account).
  if (user && !error) redirect("/mail");

  const message = typeof error === "string" ? (ERRORS[error] ?? ERRORS.sign_in_failed) : null;

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="brand-mark">
          <Icon name="mail" size={32} />
        </div>
        <h1>Welcome to Mmail</h1>
        <p>Sign in with your Google account to open your Gmail inbox.</p>
        {message && (
          <p className="login-error" role="alert">
            {message}
          </p>
        )}
        {/* Plain link, not next/link: this starts a full-page OAuth redirect. */}
        <a href="/api/auth/google" className="btn google-btn">
          <GoogleG />
          Sign in with Google
        </a>
        <p className="login-note">
          Mmail is open source and only talks to Google and your own Gmail account.
        </p>
        <Link href="/" className="btn btn-text" style={{ marginTop: 8 }}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
