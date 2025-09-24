import { Form, data, type ActionFunctionArgs } from "react-router";
import { PageHeader, Card } from "~/components/ui";
import { loginUser, createSessionCookieHeader } from "~/lib/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return data({ error: "Email & password wajib diisi" }, { status: 400 });
  }

  try {
    const resp = await loginUser(email, password);
    const user = resp.data.user;
    const cookie = createSessionCookieHeader(user.id, (user.user_metadata as any)?.role);
    return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": cookie } });
  } catch (err: any) {
    console.error(err);
    return data({ error: err.message ?? "Gagal login" }, { status: 400 });
  }
};

export default function LoginRoute() {
  return (
    <section>
      <PageHeader title="Masuk" description="Masuk untuk melakukan checkout atau melihat profil" />
      <Card>
        <Form method="post" style={{ display: "grid", gap: 12 }}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="button primary">Masuk</button>
            <a className="button outline" href="/">Batal</a>
          </div>
        </Form>
      </Card>
    </section>
  );
}
