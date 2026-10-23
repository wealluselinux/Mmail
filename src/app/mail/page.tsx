import { redirect } from "next/navigation";
import { Inbox } from "@/components/Inbox";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Inbox · Mmail" };
export const dynamic = "force-dynamic";

export default async function MailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Inbox
      user={{ email: user.email, name: user.name, picture: user.picture }}
    />
  );
}
