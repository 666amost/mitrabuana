import { Link, data, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Badge, Card, PageHeader, PropertyList } from "~/components/ui";
import { isSupabaseConfigured, getOrderWithItems } from "~/lib/db.server";
import { SAMPLE_ORDER } from "~/lib/sample-data";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const orderId = params.id;
  if (!orderId) {
    throw new Response("Order tidak ditemukan", { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    const sample = orderId === SAMPLE_ORDER.order.id ? SAMPLE_ORDER : SAMPLE_ORDER;
    return data({ ...sample, isMock: true });
  }

  const detail = await getOrderWithItems(orderId);
  if (!detail) {
    throw new Response("Order tidak ditemukan", { status: 404 });
  }

  return data({ ...detail, isMock: false });
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value) : "-";

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

export default function InvoiceRoute() {
  const { order, items, isMock } = useLoaderData<typeof loader>();

  return (
    <section>
      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Invoice ini menggunakan data contoh. Integrasikan Supabase & Vercel Blob untuk mengaktifkan invoice nyata.</p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title={`Invoice #${order.id.slice(0, 8).toUpperCase()}`}
        description="Invoice digital siap diunduh. Sertakan bukti transfer untuk mempercepat proses verifikasi sebelum masuk ke fase produksi."
        actions={
          <Link className="button outline" to="/">
            Kembali ke katalog
          </Link>
        }
      />

      <div className="grid two" style={{ alignItems: "flex-start" }}>
        <Card
          title="Ringkasan Tagihan"
          subtitle={new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
          headerExtra={<Badge variant={statusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>}
        >
          <PropertyList
            items={[
              { label: "Subtotal", value: formatCurrency(order.subtotal) },
              { label: "Ongkir", value: formatCurrency(order.shippingCost) },
              { label: "Total", value: <strong>{formatCurrency(order.total)}</strong> },
              { label: "Metode", value: "QRIS statis / Transfer manual" }
            ]}
          />

          <div style={{ marginTop: 18 }}>
            <h4 className="section-title" style={{ marginBottom: 10 }}>Detail item</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
              {items.map((item) => (
                <li key={item.productId} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <strong>{item.productName}</strong>
                    <small style={{ display: "block", color: "var(--text-muted)", marginTop: 4 }}>
                      {item.quantity} × {formatCurrency(item.priceEach)}
                    </small>
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(item.priceEach * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="grid" style={{ gap: 18 }}>
          <Card title="Akses Invoice">
            {order.invoiceUrl ? (
              <a className="button primary" href={order.invoiceUrl} target="_blank" rel="noreferrer">
                Unduh Invoice PDF
              </a>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Invoice sedang diproses otomatis. Muat ulang halaman beberapa detik lagi.</p>
            )}
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
              Invoice memuat QRIS statis dan rekening; unggah bukti bayar di portal pelanggan atau kirim ke email tim admin.
            </p>
          </Card>

          <Card title="Status pengiriman" className="compact">
            <PropertyList
              columns={1}
              items={[
                { label: "Kurir", value: order.shippingCourier ?? "Belum ditentukan" },
                { label: "Layanan", value: order.shippingService ?? "-" },
                { label: "Nomor resi", value: order.trackingNumber ?? "Belum diinput" }
              ]}
            />
          </Card>
        </div>
      </div>
    </section>
  );
}
