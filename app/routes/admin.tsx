import { PageHeader } from "~/components/ui";
import { Outlet, data, redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { getSupabaseSession } from "~/lib/session.server";
import { getProfile } from "~/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSupabaseSession(request);

  if (!session?.user?.id) {
    throw redirect("/auth/simple");
  }

  // Check if user has admin role (prefer profiles table)
  const profile = await getProfile(session.user.id);
  const userRole = profile?.role || session.user.role || 'user';

  if (userRole !== 'admin') {
    // Regular user, redirect to profile with error
    throw redirect("/profile?error=access_denied");
  }

  return data({ 
    user: session.user,
    userRole 
  });
};

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <section>
      <PageHeader
        title={`Panel Admin - ${user.email}`}
        description="Kelola order masuk, verifikasi pembayaran, dan update nomor resi dari satu tempat."
        actions={
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button outline" href="/admin">
              Order Masuk
            </a>
            <a className="button outline" href="/admin/products">
              Produk
            </a>
            <a className="button outline" href="/admin/products/new">
              Tambah Produk
            </a>
            <a className="button outline" href="/profile">
              Profil
            </a>
          </nav>
        }
      />
      <Outlet />
    </section>
  );
}
