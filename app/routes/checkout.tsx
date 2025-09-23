import {
  Form,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useActionData,
  useLoaderData
} from "react-router";
import { Badge, Card, EmptyState, PageHeader, PropertyList } from "~/components/ui";
import {
  createOrder,
  getProductById,
  isSupabaseConfigured,
  listProducts,
  setInvoiceUrl,
  type CreateOrderResult
} from "~/lib/db.server";
import {
  DEFAULT_RATE_CARDS,
  estimateShipping,
  type Dimensions
} from "~/lib/shipping.server";
import { SAMPLE_PRODUCTS } from "~/lib/sample-data";
import { generateInvoice } from "~/lib/invoice.server";

interface LoaderData {
  products: Awaited<ReturnType<typeof listProducts>>;
  selectedProductId: string | null;
  rates: typeof DEFAULT_RATE_CARDS;
  isMock: boolean;
}

interface ActionData {
  formError?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const requestedId = url.searchParams.get("productId");

  if (!isSupabaseConfigured()) {
    const selectedProduct = requestedId
      ? SAMPLE_PRODUCTS.find((product) => product.id === requestedId) ?? null
      : SAMPLE_PRODUCTS[0] ?? null;

    return data<LoaderData>({
      products: SAMPLE_PRODUCTS,
      selectedProductId: selectedProduct?.id ?? null,
      rates: DEFAULT_RATE_CARDS,
      isMock: true
    });
  }

  const products = await listProducts();
  const selectedProduct = requestedId
    ? products.find((product) => product.id === requestedId) ?? null
    : products[0] ?? null;

  return data<LoaderData>({
    products,
    selectedProductId: selectedProduct?.id ?? null,
    rates: DEFAULT_RATE_CARDS,
    isMock: false
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!isSupabaseConfigured()) {
    return data<ActionData>(
      { formError: "Konfigurasi Supabase & Vercel Blob belum tersedia. Lengkapi .env terlebih dahulu." },
      { status: 400 }
    );
  }

  const formData = await request.formData();

  const productId = formData.get("productId")?.toString();
  const quantity = Number(formData.get("quantity") ?? "1");
  const logistic = formData.get("logistic")?.toString();
  const customerName = formData.get("customerName")?.toString();
  const customerEmail = formData.get("customerEmail")?.toString();
  const customerPhone = formData.get("customerPhone")?.toString() ?? null;
  const note = formData.get("note")?.toString() ?? null;

  const address = {
    line1: formData.get("addressLine1")?.toString() ?? "",
    line2: formData.get("addressLine2")?.toString() ?? "",
    city: formData.get("city")?.toString() ?? "",
    province: formData.get("province")?.toString() ?? "",
    postalCode: formData.get("postalCode")?.toString() ?? ""
  };

  if (!productId) {
    return data<ActionData>({ formError: "Produk wajib dipilih" }, { status: 400 });
  }

  if (!logistic) {
    return data<ActionData>({ formError: "Pilih kurir & layanan" }, { status: 400 });
  }

  if (Number.isNaN(quantity) || quantity < 1) {
    return data<ActionData>({ formError: "Jumlah minimal 1" }, { status: 400 });
  }

  const [courier, service] = logistic.split("|");

  if (!courier || !service) {
    return data<ActionData>({ formError: "Opsi kurir tidak valid" }, { status: 400 });
  }

  const required = [customerName, customerEmail, address.line1, address.city, address.province, address.postalCode];
  if (required.some((value) => !value)) {
    return data<ActionData>({ formError: "Harap lengkapi data pelanggan & alamat" }, { status: 400 });
  }

  try {
    const product = await getProductById(productId);
    if (!product) {
      return data<ActionData>({ formError: "Produk tidak ditemukan" }, { status: 404 });
    }

    const dims: Dimensions = {
      l: Number(formData.get("lengthCm") ?? product.lengthCm ?? 10),
      w: Number(formData.get("widthCm") ?? product.widthCm ?? 10),
      h: Number(formData.get("heightCm") ?? product.heightCm ?? 10)
    };

    const shipping = estimateShipping({
      weightGram: product.weightGram * quantity,
      dims,
      courier,
      service
    });

    const orderResult: CreateOrderResult = await createOrder({
      userId: null,
      customerName: customerName!,
      customerEmail: customerEmail!,
      customerPhone,
      address,
      courier,
      courierService: service,
      shippingCost: shipping.cost,
      items: [{ productId, quantity }],
      note
    });

    const invoiceUrl = await generateInvoice(
      {
        id: orderResult.order.id,
        customerName: orderResult.order.customerName,
        subtotal: orderResult.order.subtotal,
        shippingCost: orderResult.order.shippingCost,
        total: orderResult.order.total,
        createdAt: orderResult.order.createdAt
      },
      orderResult.lineItems.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        priceEach: item.priceEach
      }))
    );

    await setInvoiceUrl(orderResult.order.id, invoiceUrl);

    return redirect(`/invoice/${orderResult.order.id}`);
  } catch (error) {
    console.error(error);
    return data<ActionData>(
      { formError: error instanceof Error ? error.message : "Terjadi kesalahan" },
      { status: 500 }
    );
  }
};

const formatCurrency = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value) : "-";

export default function CheckoutRoute() {
  const { products, selectedProductId, rates, isMock } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  if (!products.length) {
    return (
      <EmptyState
        title="Belum ada produk"
        description="Tambahkan data produk di Supabase agar pelanggan dapat memesan."
        action={
          <a className="button primary" href="https://supabase.com" target="_blank" rel="noreferrer">
            Buka Supabase
          </a>
        }
      />
    );
  }

  const logisticOptions = rates.map((rate) => ({
    value: `${rate.courier}|${rate.service}`,
    label: `${rate.courier} — ${rate.service} (${formatCurrency(rate.basePrice)}/Kg)`
  }));

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];

  return (
    <section>
      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Form checkout ini menampilkan data sample. Supabase perlu dikonfigurasi agar proses order sesungguhnya berjalan.
            </p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title="Checkout Custom Print"
        description="Konfirmasi detail produk, alamat pengiriman, dan preferensi finishing. Invoice digital akan tergenerate otomatis lengkap dengan instruksi pembayaran QRIS/manual transfer."
      />

      {actionData?.formError ? (
        <div className="banner" style={{ marginBottom: 28 }}>
          <div>
            <strong>Form belum valid</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{actionData.formError}</p>
          </div>
        </div>
      ) : null}

      <div className="grid two" style={{ alignItems: "flex-start" }}>
        <Card title="Detail Pesanan">
          <Form method="post" className="grid" style={{ gap: 28 }}>
            <section>
              <h3 className="section-title">Produk</h3>
              <div className="grid form">
                <label>
                  Pilih produk
                  <select name="productId" defaultValue={selectedProductId ?? undefined} required>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jumlah
                  <input name="quantity" type="number" min={1} defaultValue={1} required />
                  <span className="helper-text">Produksi batch akan menyesuaikan jumlah ini.</span>
                </label>
              </div>
              <div className="grid form" style={{ marginTop: 16 }}>
                <label>
                  Panjang custom (cm)
                  <input name="lengthCm" type="number" placeholder={selectedProduct.lengthCm?.toString() ?? "10"} />
                </label>
                <label>
                  Lebar custom (cm)
                  <input name="widthCm" type="number" placeholder={selectedProduct.widthCm?.toString() ?? "10"} />
                </label>
                <label>
                  Tinggi custom (cm)
                  <input name="heightCm" type="number" placeholder={selectedProduct.heightCm?.toString() ?? "10"} />
                </label>
              </div>
            </section>

            <section>
              <h3 className="section-title">Kurir & layanan</h3>
              <label>
                Pilihan kurir
                <select name="logistic" required defaultValue={logisticOptions[0]?.value}>
                  {logisticOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="helper-text">Estimasi ongkir dihitung dari berat aktual vs volumetrik (dimensi / 6000).</span>
            </section>

            <section>
              <h3 className="section-title">Informasi pelanggan</h3>
              <div className="grid form">
                <label>
                  Nama lengkap
                  <input name="customerName" type="text" required />
                </label>
                <label>
                  Email
                  <input name="customerEmail" type="email" required />
                </label>
                <label>
                  No. Telepon
                  <input name="customerPhone" type="tel" placeholder="08xxxxxxxx" />
                </label>
                <label>
                  Kode pos
                  <input name="postalCode" type="text" required />
                </label>
              </div>
              <label style={{ marginTop: 16 }}>
                Alamat 1
                <input name="addressLine1" type="text" placeholder="Nama jalan, nomor rumah" required />
              </label>
              <label>
                Alamat 2
                <input name="addressLine2" type="text" placeholder="Kompleks, patokan, dsb" />
              </label>
              <div className="grid form">
                <label>
                  Kota/Kabupaten
                  <input name="city" type="text" required />
                </label>
                <label>
                  Provinsi
                  <input name="province" type="text" required />
                </label>
              </div>
            </section>

            <section>
              <h3 className="section-title">Catatan finishing</h3>
              <label>
                Tambahkan kebutuhan khusus
                <textarea name="note" placeholder="Contoh: Finishing matte, warna merah metalik, tambahkan lubang gantungan."></textarea>
              </label>
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="helper-text">Invoice PDF akan terbit setelah kamu klik "Buat Order".</span>
              <button type="submit" className="button primary">
                Buat order & invoice
              </button>
            </div>
          </Form>
        </Card>

        <div className="grid" style={{ gap: 18 }}>
          <Card title="Ringkasan" subtitle="Cek kembali sebelum lanjut" className="compact">
            <PropertyList
              items={[
                { label: "Produk", value: selectedProduct.name },
                { label: "Harga", value: formatCurrency(selectedProduct.price) },
                { label: "Berat", value: `${selectedProduct.weightGram} gram` },
                { label: "Stok buffer", value: selectedProduct.stock ?? 0 }
              ]}
            />
          </Card>

          <Card title="Pilihan kurir" className="compact">
            <div className="grid" style={{ gap: 12 }}>
              {rates.map((rate) => (
                <div key={`${rate.courier}-${rate.service}`} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px"
                }}>
                  <div>
                    <strong>{rate.courier}</strong>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{rate.service}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600 }}>{formatCurrency(rate.basePrice)}</div>
                    <small style={{ color: "var(--text-muted)" }}>+ {formatCurrency(rate.addlKgPrice)} / kg tambahan</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Pembayaran">
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
              Setelah checkout, invoice akan menampilkan QRIS statis dan rekening manual transfer. Tim admin siap memverifikasi pembayaran dalam 1x24 jam kerja.
            </p>
            <Badge variant="success">Invoice otomatis</Badge>
          </Card>
        </div>
      </div>
    </section>
  );
}
