import { redirect } from "next/navigation";
import { Inbox } from "@/components/Inbox";
import { getLinkedAccounts, getSessionUser } from "@/lib/session";

export const metadata = { title: "Inbox · Mmail" };
export const dynamic = "force-dynamic";

export default async function MailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const accounts = await getLinkedAccounts();

  return (
    <Inbox
      user={{ sub: user.google_sub, email: user.email, name: user.name, picture: user.picture }}
      accounts={accounts}
    />
  );
}
