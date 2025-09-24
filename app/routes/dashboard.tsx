import { data, type LoaderFunctionArgs, Link, redirect, useLoaderData } from "react-router";
import { PageHeader, Card, PropertyList, EmptyState } from "~/components/ui";
import { getSupabaseSession } from "~/lib/session.server";
import { getProfile, listOrdersByUser } from "~/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSupabaseSession(request);
  if (!session?.user?.id) return redirect("/auth/simple");
  const profile = await getProfile(session.user.id);
  // If admin, redirect to the main admin panel
  if ((profile?.role ?? session.user.role) === 'admin') return redirect('/admin');
  const orders = await listOrdersByUser(session.user.id);
  return data({ profile, orders });
};

export default function UserDashboardRoute() {
  const { profile: p, orders: myOrders } = useLoaderData<typeof loader>();

  return (
    <section>
      <PageHeader title="Dashboard" description="Profil, alamat pengiriman, dan riwayat pesanan Anda." />
      <div className="grid two">
        <Card title="Profil & Alamat">
          {p ? (
            <PropertyList
              columns={2}
              items={[
                { label: 'Nama', value: p.name || '-' },
                { label: 'Telepon', value: p.phone || '-' },
                { label: 'Alamat 1', value: (p.address as any)?.line1 || '-' },
                { label: 'Alamat 2', value: (p.address as any)?.line2 || '-' },
                { label: 'Kota/Kab.', value: (p.address as any)?.city || '-' },
                { label: 'Provinsi', value: (p.address as any)?.province || '-' },
                { label: 'Kode Pos', value: (p.address as any)?.postalCode || '-' },
              ]}
            />
          ) : (
            <EmptyState title="Profil belum diisi" description="Lengkapi profil Anda untuk mempercepat checkout." action={<Link className="button" to="/profile">Lengkapi Profil</Link>} />
          )}
          <div style={{ marginTop: 16 }}>
            <Link className="button" to="/profile">Ubah Profil</Link>
          </div>
        </Card>

        <Card title="Riwayat Pesanan">
          {myOrders.length ? (
            <div className="order-list" style={{ display: 'grid', gap: 12 }}>
              {myOrders.map((o: any) => (
                <div key={o.id} className="order-item" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: 10, background: 'var(--bg-surface)' }}>
                  <div>
                    <strong>#{o.id.slice(0,8).toUpperCase()}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(o.createdAt).toLocaleString('id-ID')}</div>
                    {o.invoiceUrl ? (
                      <a href={o.invoiceUrl} target="_blank" rel="noreferrer" className="button ghost" style={{ marginTop: 6, padding: '4px 8px' }}>Unduh invoice</a>
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>Rp {Intl.NumberFormat('id-ID').format(o.total)}</div>
                    <span className={`status-pill ${o.status.toLowerCase()}`}>{o.status.replaceAll('_',' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada pesanan" description="Mulai belanja dari katalog kami." action={<Link className="button" to="/">Lihat Katalog</Link>} />
          )}
        </Card>
      </div>
    </section>
  );
}
