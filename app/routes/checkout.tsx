import {
  Form,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useActionData,
  useLoaderData
} from "react-router";
import { useState } from "react";
import { Badge, Card, EmptyState, PageHeader, PropertyList } from "~/components/ui";
import {
  createOrder,
  getProductById,
  isSupabaseConfigured,
  listProducts,
  setInvoiceUrl,
  getProfile,
  type CreateOrderResult
} from "~/lib/db.server";
import { getSupabaseSession } from "~/lib/session.server";
import { DEFAULT_RATE_CARDS, estimateShipping } from "~/lib/shipping.server";
import { SAMPLE_PRODUCTS } from "~/lib/sample-data";
import { generateInvoice } from "~/lib/invoice.server";
import { useCart } from "~/lib/cart";

interface LoaderData {
  products: Awaited<ReturnType<typeof listProducts>>;
  selectedProductId: string | null;
  rates: typeof DEFAULT_RATE_CARDS;
  isMock: boolean;
  profile?: Awaited<ReturnType<typeof getProfile>> | null;
  userEmail?: string | null;
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

  // Enforce login up-front
  const session = await getSupabaseSession(request);
  if (!session?.user?.id) {
    return redirect(`/auth/simple?redirect=/checkout`);
  }

  const products = await listProducts();
  if (!products.length) {
    return redirect("/");
  }

  const selectedProduct = requestedId
    ? products.find((product) => product.id === requestedId) ?? null
    : products[0] ?? null;

  // Prefill profile/email
  let profile: Awaited<ReturnType<typeof getProfile>> | null = null;
  try {
    profile = await getProfile(session.user.id);
  } catch (e) {
    console.warn("Failed to fetch profile for prefill", e);
  }

  return data<LoaderData>({
    products,
    selectedProductId: selectedProduct?.id ?? null,
    rates: DEFAULT_RATE_CARDS,
    isMock: false,
    profile,
    userEmail: session.user.email
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
  const cartJson = formData.get("cartJson")?.toString();
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

  // Enforce cart-first ordering: cart is required
  if (!cartJson) {
    return data<ActionData>({ formError: "Keranjang kosong. Tambahkan produk ke keranjang terlebih dahulu." }, { status: 400 });
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
    // require login for checkout (use Supabase session)
    const session = await getSupabaseSession(request)
    if (!session?.user?.id) {
      return redirect(`/auth/simple?redirect=/checkout`);
    }

    // Determine items: prefer cart items if provided, else single product selection
    let items: Array<{ productId: string; quantity: number }> = [];
    try {
      const parsed = JSON.parse(cartJson) as Array<{ productId: string; quantity: number }>;
      items = (parsed || []).filter(i => i && i.productId && Number(i.quantity) > 0);
    } catch (e) {
      return data<ActionData>({ formError: "Keranjang tidak valid" }, { status: 400 });
    }

    if (!items.length) {
      return data<ActionData>({ formError: "Keranjang kosong atau produk belum dipilih" }, { status: 400 });
    }

    // Compute total weight for shipping (sum of item weights)
    let totalWeightGram = 0;
    for (const it of items) {
      const p = await getProductById(it.productId);
      if (!p) return data<ActionData>({ formError: "Produk tidak ditemukan" }, { status: 404 });
      totalWeightGram += (p.weightGram ?? 0) * it.quantity;
    }

    const shipping = estimateShipping({
      weightGram: totalWeightGram,
      // keep default tiny dims for volumetric calc so weight dominates
      dims: { l: 10, w: 10, h: 10 },
      courier,
      service
    } as any);

    const orderResult: CreateOrderResult = await createOrder({
      userId: session.user.id,
      customerName: customerName!,
      customerEmail: customerEmail!,
      customerPhone,
      address,
      courier,
      courierService: service,
      shippingCost: shipping.cost,
      items,
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
  const { products, selectedProductId, rates, isMock, profile, userEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const hasCart = items.length > 0;

  // Client-side shipping estimate to display running total
  const [selectedLogistic, setSelectedLogistic] = useState<string | undefined>(undefined as any);

  // Helper calc cloned from server util (keep in sync)
  const calculateBillableWeightKg = (weightGram: number) => {
    const actualKg = Math.max(1, Math.ceil(weightGram / 1000));
    const volumetricKg = Math.max(1, Math.ceil((10 * 10 * 10) / 6000)); // default dims 10x10x10
    return Math.max(actualKg, volumetricKg);
  };
  const calculateShippingCost = (weightGram: number, value: string | undefined) => {
    if (!value) return 0;
    const [c, s] = value.split("|");
    const rate = rates.find(r => r.courier === c && r.service === s);
    if (!rate) return 0;
    const billableKg = calculateBillableWeightKg(weightGram);
    if (billableKg <= rate.baseKg) return rate.basePrice;
    return rate.basePrice + (billableKg - rate.baseKg) * rate.addlKgPrice;
  };
  const totalWeightGram = items.reduce((sum, it) => {
    const p = products.find(pr => pr.id === it.id);
    return sum + (p?.weightGram ?? 0) * it.quantity;
  }, 0);
  const shippingPreview = hasCart ? calculateShippingCost(totalWeightGram, selectedLogistic ?? (rates.length ? `${rates[0].courier}|${rates[0].service}` : undefined)) : 0;
  const grandTotal = totalPrice + shippingPreview;

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
    label: `${rate.courier} • ${rate.service} (${formatCurrency(rate.basePrice)}/Kg)`
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
        title="Keranjang & Checkout"
        description="Review produk yang dipilih, konfirmasi alamat pengiriman, dan pilih metode pembayaran. Invoice digital akan tergenerate otomatis."
      />

      {!userEmail && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <div>
            <strong>Masuk diperlukan</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Silakan <a href="/auth/simple?redirect=/checkout">masuk</a> untuk melanjutkan checkout dan menyimpan data pengiriman Anda.
            </p>
          </div>
        </div>
      )}

      {/* Cart Items Section (only if logged in) */}
      {userEmail && hasCart ? (
        <Card title="Keranjang Belanja" subtitle={`${items.length} item dipilih`}>
          <div className="cart-items" style={{ display: "grid", gap: "16px" }}>
            {items.map((item) => (
              <div key={item.id} className="cart-item" style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "16px", 
                padding: "16px", 
                border: "1px solid var(--border-subtle)", 
                borderRadius: "8px",
                background: "var(--bg-surface)"
              }}>
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    style={{ 
                      width: "60px", 
                      height: "60px", 
                      objectFit: "cover", 
                      borderRadius: "6px",
                      background: "var(--bg-subtle)"
                    }} 
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{item.name}</h4>
                  <p style={{ margin: "4px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                    {formatCurrency(item.price)} per unit
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button 
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{ 
                      background: "var(--bg-subtle)", 
                      border: "1px solid var(--border-subtle)", 
                      borderRadius: "4px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: "20px", textAlign: "center", fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button 
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{ 
                      background: "var(--bg-subtle)", 
                      border: "1px solid var(--border-subtle)", 
                      borderRadius: "4px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ textAlign: "right", minWidth: "80px" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => removeItem(item.id)}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    color: "var(--text-danger)", 
                    cursor: "pointer",
                    padding: "4px"
                  }}
                  title="Hapus dari keranjang"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ 
            marginTop: "16px", 
            padding: "16px", 
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button 
              type="button" 
              onClick={clearCart}
              className="button outline"
            >
              Kosongkan Keranjang
            </button>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                Total: {formatCurrency(totalPrice)}
              </p>
            </div>
          </div>
        </Card>
      ) : userEmail ? (
        <EmptyState
          title="Keranjang kosong"
          description="Tambahkan produk dari katalog untuk mulai berbelanja"
          action={
            <a className="button primary" href="/">
              Lihat Katalog
            </a>
          }
        />
      ) : null}

      {actionData?.formError ? (
        <div className="banner" style={{ marginBottom: 28 }}>
          <div>
            <strong>Form belum valid</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{actionData.formError}</p>
          </div>
        </div>
      ) : null}

      {userEmail && hasCart ? (
  <div className="grid two" style={{ alignItems: "flex-start" }}>
        <Card title="Detail Pesanan">
          <Form method="post" className="grid" style={{ gap: 28 }}>
            {/* When cart has items, send them as JSON to the server */}
            {hasCart ? (
              <input type="hidden" name="cartJson" value={JSON.stringify(items.map(i => ({ productId: i.id, quantity: i.quantity })))} />
            ) : null}
            <section>
              <h3 className="section-title">Produk</h3>
              <p className="helper-text">Checkout menggunakan item di keranjang. Ubah kuantitas/hapus item pada bagian Keranjang di atas.</p>
            </section>

            <section>
              <h3 className="section-title">Kurir & layanan</h3>
              <label>
                Pilihan kurir
                <select
                  name="logistic"
                  required
                  defaultValue={logisticOptions[0]?.value}
                  onChange={(e) => setSelectedLogistic(e.currentTarget.value)}
                >
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
                  <input name="customerName" type="text" defaultValue={profile?.name ?? undefined} required />
                </label>
                <label>
                  Email
                  <input name="customerEmail" type="email" defaultValue={userEmail ?? undefined} required />
                </label>
                <label>
                  No. Telepon
                  <input name="customerPhone" type="tel" defaultValue={profile?.phone ?? undefined} placeholder="08xxxxxxxx" />
                </label>
                <label>
                  Kode pos
                  <input name="postalCode" type="text" defaultValue={profile?.address?.postalCode as string | undefined} required />
                </label>
              </div>
              <label style={{ marginTop: 16 }}>
                Alamat 1
                <input name="addressLine1" type="text" defaultValue={profile?.address?.line1 as string | undefined} placeholder="Nama jalan, nomor rumah" required />
              </label>
              <label>
                Alamat 2
                <input name="addressLine2" type="text" defaultValue={profile?.address?.line2 as string | undefined} placeholder="Kompleks, patokan, dsb" />
              </label>
              <div className="grid form">
                <label>
                  Kota/Kabupaten
                  <input name="city" type="text" defaultValue={profile?.address?.city as string | undefined} required />
                </label>
                <label>
                  Provinsi
                  <input name="province" type="text" defaultValue={profile?.address?.province as string | undefined} required />
                </label>
              </div>
            </section>

            <section>
              <h3 className="section-title">Catatan pesanan (opsional)</h3>
              <label>
                <textarea name="note" placeholder="Contoh: Tolong packing aman, kirim di jam kerja."></textarea>
              </label>
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="helper-text">Invoice PDF akan terbit setelah kamu klik "Buat Order".</span>
              <button type="submit" className="button primary" disabled={!userEmail || !hasCart}>
                Buat order & invoice
              </button>
            </div>
          </Form>
        </Card>

        <div className="grid" style={{ gap: 18 }}>
          <Card title="Ringkasan" subtitle="Cek kembali sebelum lanjut" className="compact">
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {items.map((it) => {
                const p = products.find((pr) => pr.id === it.id);
                return (
                  <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{p?.name ?? it.id} × {it.quantity}</span>
                    <strong>{formatCurrency((p?.price ?? 0) * it.quantity)}</strong>
                  </li>
                )
              })}
            </ul>
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 10, paddingTop: 10, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <strong>{formatCurrency(totalPrice)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ongkir (preview)</span>
                <strong>{formatCurrency(shippingPreview)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: 6 }}>
                <span>Total</span>
                <strong>{formatCurrency(grandTotal)}</strong>
              </div>
            </div>
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
      ) : null}
    </section>
  );
}
