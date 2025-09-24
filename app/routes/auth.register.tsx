import { Form, redirect, data, type ActionFunctionArgs } from "react-router";
import { PageHeader, Card } from "~/components/ui";
import { registerUser, createSessionCookieHeader } from "~/lib/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const asAdmin = formData.get("asAdmin")?.toString() === "on";

  if (!email || !password) {
    return data({ error: "Email & password wajib diisi" }, { status: 400 });
  }

  try {
    const user = await registerUser(email, password, asAdmin ? "admin" : "customer");
    const cookie = createSessionCookieHeader(user.id, asAdmin ? "admin" : "customer");
    return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": cookie } });
  } catch (err: any) {
    console.error(err);
    return data({ error: err.message ?? "Gagal register" }, { status: 500 });
  }
};

export default function RegisterRoute() {
  return (
    <section>
      <PageHeader title="Daftar" description="Buat akun baru" />
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
          <label>
            <input name="asAdmin" type="checkbox" /> Daftar sebagai admin (gunakan dengan hati-hati)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="button primary">Daftar</button>
            <a className="button outline" href="/">Batal</a>
          </div>
        </Form>
      </Card>
    </section>
  );
}
