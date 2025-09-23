import { Link, data, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Badge, Card, EmptyState } from "~/components/ui";
import { isSupabaseConfigured, listOrders } from "~/lib/db.server";
import { SAMPLE_ORDERS } from "~/lib/sample-data";

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const statusVariant = (status: string) => {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "success" as const;
    case "SHIPPED":
      return "neutral" as const;
    default:
      return "warning" as const;
  }
};

export const loader = async (_args: LoaderFunctionArgs) => {
  if (!isSupabaseConfigured()) {
    return data({ orders: SAMPLE_ORDERS, isMock: true });
  }

  const orders = await listOrders();
  return data({ orders, isMock: false });
};

export default function AdminIndexRoute() {
  const { orders, isMock } = useLoaderData<typeof loader>();

  if (!orders.length) {
    return (
      <EmptyState
        title="Belum ada order"
        description="Pesanan akan muncul otomatis setelah pelanggan selesai checkout."
      />
    );
  }

  return (
    <Card title="Order terkini" subtitle="Urut berdasarkan waktu dibuat" className="compact">
      {isMock ? (
        <div className="banner" style={{ marginBottom: 16 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Daftar order ini menggunakan data contoh. Hubungkan Supabase untuk melihat order asli.</p>
          </div>
        </div>
      ) : null}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td data-label="Order ID" style={{ fontFamily: "monospace", fontSize: 12 }}>{order.id}</td>
                <td data-label="Customer">{order.customerName}</td>
                <td data-label="Total">{formatCurrency(order.total)}</td>
                <td data-label="Status">
                  <Badge variant={statusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
                </td>
                <td data-label="Aksi">
                  <div className="table-actions">
                    <Link className="button ghost" to={`/admin/orders/${order.id}`}>
                      Detail
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}