import { data, type LoaderFunctionArgs, Link, redirect } from "react-router";
import { PageHeader, Card, EmptyState, Badge } from "~/components/ui";
import { getSupabaseSession } from "~/lib/session.server";
import { getProfile, listOrders } from "~/lib/db.server";
import { useLoaderData } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSupabaseSession(request);
  if (!session?.user?.id) return redirect("/auth/simple");
  const profile = await getProfile(session.user.id);
  if ((profile?.role ?? session.user.role) !== 'admin') return redirect('/profile?error=access_denied');
  const orders = await listOrders();
  return data({ orders });
};

export default function AdminDashboardRoute() {
  const { orders } = useLoaderData<typeof loader>();
  return (
    <section>
      <PageHeader title="Admin Dashboard" description="Kelola katalog, pesanan, dan operasional toko." />
      <div className="grid two">
        <Card title="Aksi Cepat">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="button" to="/admin/products/new">Tambah Produk</Link>
            <Link className="button" to="/admin">Order Masuk</Link>
            <Link className="button" to="/">Lihat Toko</Link>
          </div>
        </Card>
        <Card title="Pesanan Terbaru">
          {orders?.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {orders.slice(0,8).map((o: any) => (
                <div key={o.id} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>#{String(o.id).slice(0,8).toUpperCase()}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(o.createdAt).toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>Rp {Intl.NumberFormat('id-ID').format(o.total ?? 0)}</div>
                    <Badge variant={['PAID','DELIVERED'].includes(o.status) ? 'success' : o.status==='SHIPPED' ? 'neutral' : 'warning'}>
                      {String(o.status ?? '').replaceAll('_',' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada pesanan" description="Pesanan akan muncul di sini saat pelanggan checkout." />
          )}
        </Card>
      </div>
    </section>
  );
}
