import { Link, data, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Badge, Card, PageHeader, PropertyList } from "~/components/ui";
import { isSupabaseConfigured, getProductById } from "~/lib/db.server";
import { SAMPLE_PRODUCTS } from "~/lib/sample-data";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const productId = params.id;
  if (!productId) {
    throw new Response("Produk tidak ditemukan", { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    const fallback = SAMPLE_PRODUCTS.find((item) => item.id === productId) ?? SAMPLE_PRODUCTS[0];
    if (!fallback) {
      throw new Response("Produk tidak ditemukan", { status: 404 });
    }
    return data({ product: fallback, isMock: true });
  }

  const product = await getProductById(productId);
  if (!product) {
    throw new Response("Produk tidak ditemukan", { status: 404 });
  }

  return data({ product, isMock: false });
};

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const resolveCategory = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("brake") || lower.includes("kampas")) return "Sistem pengereman";
  if (lower.includes("spark")) return "Tune-up";
  return "Performa mesin";
};

export default function ProductDetailRoute() {
  const { product, isMock } = useLoaderData<typeof loader>();
  const category = resolveCategory(product.name);

  return (
    <section>
      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>Detail produk menggunakan data contoh. Aktivasi Supabase untuk menampilkan spesifikasi asli dari katalog kamu.</p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title={product.name}
        description="Oli dan sparepart premium yang menjaga performa motor tetap optimal."
        actions={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button outline" to="/">
              Kembali ke katalog
            </Link>
            <Link className="button primary" to={`/checkout?productId=${product.id}`}>
              Tambahkan ke order
            </Link>
          </div>
        }
      />

      <div className="grid two">
        <Card title="Preview produk" subtitle={category}>
          <div
            className="product-preview"
            style={{
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(145deg, rgba(239, 68, 68, 0.08), rgba(255, 255, 255, 0.95))",
              padding: "42px 28px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "280px"
            }}
          >
            {product.images && product.images[0] ? (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "240px", 
                  objectFit: "contain",
                  borderRadius: "var(--radius-md)",
                  margin: "0 auto" 
                }} 
              />
            ) : (
              <p style={{ color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
                Unggah foto produk ke Supabase untuk menggantikan placeholder. Sistem otomatis akan mengambil URL dari kolom <code>images</code>.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Spesifikasi"
          subtitle="Pastikan kompatibilitas sebelum checkout"
          headerExtra={<Badge variant={product.stock && product.stock > 0 ? "success" : "warning"}>{product.stock && product.stock > 0 ? `${product.stock} ready` : "Made to order"}</Badge>}
        >
          <PropertyList
            columns={2}
            items={[
              { label: "Harga", value: formatCurrency(product.price) },
              { label: "Berat", value: `${product.weightGram} gram` },
              { label: "Dimensi", value: `${product.lengthCm ?? "-"} x ${product.widthCm ?? "-"} x ${product.heightCm ?? "-"} cm` },
              { label: "Kode SKU", value: product.id.slice(0, 10).toUpperCase() }
            ]}
          />
          <p style={{ marginTop: 18, fontSize: 14, color: "var(--text-secondary)" }}>
            Ideal untuk motor sport dan matic premium. Sertakan preferensi viskositas atau kebutuhan part tambahan pada kolom catatan checkout.
          </p>
        </Card>
      </div>

      <div className="grid two" style={{ marginTop: 24 }}>
        <Card title="Rekomendasi penggunaan">
          <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 12, color: "var(--text-secondary)", fontSize: 14 }}>
            <li>Ganti setiap 3.000 – 4.000 km untuk menjaga performa mesin optimal.</li>
            <li>Sudah memenuhi standar API SN / JASO MA2.</li>
            <li>Cocok untuk riding harian dan touring berjarak jauh.</li>
          </ul>
        </Card>
        <Card title="Checklist QC & pengiriman">
          <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 12, color: "var(--text-secondary)", fontSize: 14 }}>
            <li>Segel botol dan nomor batch diverifikasi.</li>
            <li>Packing anti bocor dengan bubble wrap tebal.</li>
            <li>Foto bukti QC dikirim ke email sebelum resi diterbitkan.</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
