import { data, type LoaderFunctionArgs } from "react-router";
import { PageHeader, Card } from "~/components/ui";
import { parseCookies, decodeSessionCookie } from "~/lib/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookies = parseCookies(request);
  const session = decodeSessionCookie(cookies["sb_user"]);
  if (!session) {
    return data({ isLoggedIn: false });
  }

  return data({ isLoggedIn: true, user: session });
};

export default function ProfileRoute() {
  // UI is simple; details provided by loader in real app
  return (
    <section>
      <PageHeader title="Profil" description="Area akun" />
      <Card>
        <p>Anda login. Gunakan tombol logout untuk keluar.</p>
        <a className="button outline" href="/auth.logout">Logout</a>
      </Card>
    </section>
  );
}
