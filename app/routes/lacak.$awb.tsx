import { Link, data, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Badge, Card, PageHeader, PropertyList, Timeline } from "~/components/ui";
import { isSupabaseConfigured, findOrderByTrackingNumber } from "~/lib/db.server";
import { SAMPLE_ORDER } from "~/lib/sample-data";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const awb = params.awb;
  if (!awb) {
    throw new Response("Nomor resi tidak diberikan", { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return data({ order: SAMPLE_ORDER.order, isMock: true });
  }

  const order = await findOrderByTrackingNumber(awb);
  if (!order) {
    throw new Response("Resi tidak ditemukan", { status: 404 });
  }

  return data({ order, isMock: false });
};

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

export default function TrackingRoute() {
  const { order, isMock } = useLoaderData<typeof loader>();
  const history = Array.isArray(order.trackingHistory) ? (order.trackingHistory as Array<any>) : [];

  return (
    <section>
      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Tracking ini menampilkan contoh status. Setelah Supabase terhubung, data akan mengikuti update real-time dari admin.</p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title="Lacak pengiriman"
        description="Pantau perjalanan paket dari studio kami hingga sampai di alamatmu. Status diperbarui manual oleh admin ketika terdapat update dari kurir."
        actions={
          <Link className="button outline" to="/">
            Kembali ke katalog
          </Link>
        }
      />

      <div className="grid two" style={{ alignItems: "flex-start" }}>
        <Card
          title={`Nomor Resi ${order.trackingNumber ?? "Belum tersedia"}`}
          subtitle={`Status saat ini: ${order.status.replaceAll("_", " ")}`}
          headerExtra={<Badge variant={statusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>}
        >
          {history.length ? (
            <Timeline
              items={history.map((entry: any) => ({
                title: entry.status ?? entry.location ?? "Update pengiriman",
                description: entry.description ?? "",
                timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) : undefined
              }))}
            />
          ) : (
            <div className="empty-state">
              <h3>Belum ada pembaruan</h3>
              <p className="intro">Tim admin akan menginput progres begitu terdapat update dari kurir.</p>
            </div>
          )}
        </Card>

        <Card title="Detail pengiriman" className="compact">
          <PropertyList
            items={[
              { label: "Kurir", value: order.shippingCourier ?? "Belum dipilih" },
              { label: "Layanan", value: order.shippingService ?? "-" },
              { label: "Pemesan", value: order.customerName },
              { label: "Email", value: order.customerEmail },
              { label: "Total", value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.total) }
            ]}
          />
        </Card>
      </div>
    </section>
  );
}
