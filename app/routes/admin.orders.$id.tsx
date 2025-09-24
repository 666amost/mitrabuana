import {
  Form,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useActionData,
  useLoaderData
} from "react-router";
import { Badge, Card, PageHeader, PropertyList } from "~/components/ui";
import {
  getOrderWithItems,
  isSupabaseConfigured,
  setInvoiceUrl,
  updateOrderStatus,
  updateTracking,
  type OrderStatus
} from "~/lib/db.server";
import { SAMPLE_ORDER } from "~/lib/sample-data";
import { generateInvoice } from "~/lib/invoice.server";

interface ActionData {
  error?: string;
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const orderId = params.id;
  if (!orderId) {
    throw new Response("Order tidak ditemukan", { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    return data({ ...SAMPLE_ORDER, isMock: true });
  }

  const detail = await getOrderWithItems(orderId);
  if (!detail) {
    throw new Response("Order tidak ditemukan", { status: 404 });
  }

  return data({ ...detail, isMock: false });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (!isSupabaseConfigured()) {
    return data<ActionData>({ error: "Konfigurasi Supabase belum tersedia." }, { status: 400 });
  }

  const orderId = params.id;
  if (!orderId) {
    return data<ActionData>({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("_action")?.toString();

  try {
    switch (intent) {
      case "set-status": {
        const status = formData.get("status")?.toString() as OrderStatus | undefined;
        if (!status) {
          return data<ActionData>({ error: "Status tidak valid" }, { status: 400 });
        }
        await updateOrderStatus(orderId, status);
        break;
      }
      case "update-tracking": {
        const trackingNumber = formData.get("trackingNumber")?.toString();
        const trackingNote = formData.get("trackingNote")?.toString();
        if (!trackingNumber) {
          return data<ActionData>({ error: "Nomor resi wajib diisi" }, { status: 400 });
        }
        const detail = await getOrderWithItems(orderId);
        if (!detail) {
          return data<ActionData>({ error: "Order tidak ditemukan" }, { status: 404 });
        }
        const history = Array.isArray(detail.order.trackingHistory)
          ? [...(detail.order.trackingHistory as any[])]
          : [];
        history.push({
          status: trackingNote || "Update",
          timestamp: new Date().toISOString()
        });
        await updateTracking(orderId, trackingNumber, history);
        break;
      }
      case "regenerate-invoice": {
        const detail = await getOrderWithItems(orderId);
        if (!detail) {
          return data<ActionData>({ error: "Order tidak ditemukan" }, { status: 404 });
        }
        const invoiceUrl = await generateInvoice(
          {
            id: detail.order.id,
            customerName: detail.order.customerName,
            subtotal: detail.order.subtotal,
            shippingCost: detail.order.shippingCost,
            total: detail.order.total,
            createdAt: detail.order.createdAt
          },
          detail.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            priceEach: item.priceEach
          }))
        );
        await setInvoiceUrl(detail.order.id, invoiceUrl);
        break;
      }
      default:
        return data<ActionData>({ error: "Aksi tidak dikenali" }, { status: 400 });
    }

    return redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error(error);
    return data<ActionData>(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan" },
      { status: 500 }
    );
  }
};

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

export default function AdminOrderDetailRoute() {
  const { order, items, isMock } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const addressEntries = Object.entries((order.address ?? {}) as Record<string, unknown>).filter(([, value]) => value !== null && value !== "");

  return (
    <section>
      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Detail order ini hanyalah sample. Setelah Supabase terhubung, order nyata akan tampil di sini.</p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title={`Order ${order.id}`}
        description={`Dibuat pada ${new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`}
      />

      {actionData?.error ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Aksi gagal</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{actionData.error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid two" style={{ alignItems: "flex-start" }}>
        <Card
          title="Detail pelanggan"
          subtitle={order.customerEmail}
          headerExtra={<Badge variant={statusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>}
        >
          <PropertyList
            columns={2}
            items={[
              { label: "Nama", value: order.customerName },
              { label: "Telepon", value: order.customerPhone ?? "-" },
              { label: "Subtotal", value: formatCurrency(order.subtotal) },
              { label: "Ongkir", value: formatCurrency(order.shippingCost ?? 0) },
              { label: "Total", value: <strong>{formatCurrency(order.total)}</strong> },
              { label: "Catatan", value: order.notes ?? "-" }
            ]}
          />

          <div style={{ marginTop: 18 }}>
            <h4 className="section-title" style={{ marginBottom: 10 }}>Alamat pengiriman</h4>
            {addressEntries.length ? (
              <PropertyList
                columns={2}
                items={addressEntries.map(([key, value]) => ({
                  label: key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
                  value: String(value)
                }))}
              />
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Belum ada alamat yang tersimpan.</p>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <h4 className="section-title" style={{ marginBottom: 10 }}>Item yang dipesan</h4>
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
          <Card title="Ubah status" className="compact">
            <Form method="post" style={{ display: "grid", gap: 12 }}>
              <input type="hidden" name="_action" value="set-status" />
              <label>
                Status order
                <select name="status" defaultValue={order.status}>
                  <option value="PENDING_PAYMENT">Pending Payment</option>
                  <option value="PAID">Paid</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </label>
              <button type="submit" className="button primary">
                Simpan perubahan
              </button>
            </Form>
          </Card>

          <Card title="Update resi" className="compact">
            <Form method="post" style={{ display: "grid", gap: 12 }}>
              <input type="hidden" name="_action" value="update-tracking" />
              <label>
                Nomor resi
                <input name="trackingNumber" type="text" defaultValue={order.trackingNumber ?? ""} required />
              </label>
              <label>
                Catatan
                <input name="trackingNote" type="text" placeholder="Mis. Paket diserahkan ke kurir" />
              </label>
              <button type="submit" className="button primary">
                Simpan tracking
              </button>
            </Form>
          </Card>

          <Card title="Invoice" className="compact">
            {order.invoiceUrl ? (
              <a className="button outline" href={order.invoiceUrl} target="_blank" rel="noreferrer">
                Lihat invoice
              </a>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Invoice belum tersedia. Generate ulang jika diperlukan.</p>
            )}
            {order.paymentProofUrl ? (
              <div style={{ marginTop: 12 }}>
                <a className="button" href={order.paymentProofUrl} target="_blank" rel="noreferrer">Lihat bukti bayar</a>
              </div>
            ) : null}
            <Form method="post" style={{ marginTop: 12 }}>
              <input type="hidden" name="_action" value="regenerate-invoice" />
              <button type="submit" className="button primary">
                Generate ulang invoice
              </button>
            </Form>
          </Card>
        </div>
      </div>
    </section>
  );
}
