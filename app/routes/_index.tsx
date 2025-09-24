import { useEffect, useState } from "react";
import { Form, Link, data, useLoaderData, useNavigate, type LoaderFunctionArgs } from "react-router";
import { Badge, Card, EmptyState, PageHeader } from "~/components/ui";
import { isSupabaseConfigured, listProducts, type Product } from "~/lib/db.server";
import { SAMPLE_PRODUCTS } from "~/lib/sample-data";
import { useCart } from "~/lib/cart";

interface LoaderData {
  products: Product[];
  isMock: boolean;
}

export const loader = async (_args: LoaderFunctionArgs) => {
  if (!isSupabaseConfigured()) {
    return data<LoaderData>({ products: SAMPLE_PRODUCTS, isMock: true });
  }
  const products = await listProducts();
  return data<LoaderData>({ products, isMock: false });
};

const formatCurrency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const categories = [
  {
    title: "Performa Mesin",
    description: "Full synthetic oil, additive, coolant, dan paket tune-up untuk mesin berperforma tinggi.",
    stat: "12 SKU"
  },
  {
    title: "Sistem Pengereman",
    description: "Brake pad, master kit, minyak rem premium untuk motor harian maupun sport.",
    stat: "9 paket"
  },
  {
    title: "Servis Cepat",
    description: "Busi iridium, filter, dan sparepart fast moving untuk bengkel express.",
    stat: "6 bundle"
  }
];

const serviceHighlights = [
  {
    title: "Quality Control",
    detail: "Segel oli & part diperiksa manual, foto QC dikirim sebelum resi diterbitkan."
  },
  {
    title: "Respon Kilat",
    detail: "Pesanan sebelum jam 15.00 diproses di hari yang sama dengan packing anti bocor."
  },
  {
    title: "Support Teknis",
    detail: "Tim teknis siap bantu memilih viskositas oli & kompatibilitas part."
  }
];

const carouselSlides = (products: Product[]) => {
  const pool = products.length ? products : SAMPLE_PRODUCTS;
  return pool.slice(0, 3).map((product) => ({
    id: product.id,
    title: product.name,
    price: formatCurrency(product.price),
    category: product.name.toLowerCase().includes("brake") ? "Brake kit" : product.name.toLowerCase().includes("spark") ? "Tune-up" : "Oli premium",
    description: "Pengiriman cepat dengan segel asli dan garansi keaslian.",
    cta: `/product/${product.id}`,
    imageUrl: product.images?.[0]
  }));
};

export default function IndexRoute() {
  const { products, isMock } = useLoaderData<typeof loader>();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const slides = carouselSlides(products);
  const totalProducts = products.length;
  const avgPrice = totalProducts ? Math.round(products.reduce((acc, item) => acc + item.price, 0) / totalProducts) : 0;
  const totalStock = products.reduce((acc, item) => acc + (item.stock ?? 0), 0);

  const [activeSlide, setActiveSlide] = useState(0);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section>
      <PageHeader
        title="Solusi oli & sparepart premium Mitra Buana Jaya Part"
        description="Kami membantu bengkel motor dan enthusiast memilih oli full synthetic, brake kit, hingga part servis ringan dengan pengiriman cepat."
        actions={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="button outline" href="#catalogue">Jelajahi katalog</a>
            <a className="button primary" href="/checkout">
              Pesan paket servis
            </a>
          </div>
        }
      />

      {isMock ? (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Mode demonstrasi</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Data katalog masih sample. Hubungkan Supabase untuk menampilkan produk asli dan proses checkout penuh.
            </p>
          </div>
          <a className="button ghost" href="https://supabase.com" target="_blank" rel="noreferrer">
            Integrasikan Supabase
          </a>
        </div>
      ) : null}

      <div className="carousel" style={{ marginBottom: 32 }}>
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="carousel-slide">
              <div className="carousel-content">
                <Badge variant="neutral" className="product-category-badge">{slide.category}</Badge>
                <h2>{slide.title}</h2>
                <p style={{ color: "var(--text-secondary)" }}>{slide.description}</p>
                <span className="price">{slide.price}</span>
                <div className="buttons">
                  <Link className="button primary" to={slide.cta}>
                    Lihat detail
                  </Link>
                  <button
                    className="button outline"
                    type="button"
                    onClick={() => {
                      const p = products.find((x) => x.id === slide.id);
                      if (p) {
                        addItem({ id: p.id, name: p.name, price: p.price, image: p.images?.[0] });
                      }
                      navigate("/checkout");
                    }}
                  >
                    Pesan sekarang
                  </button>
                </div>
              </div>
              <div className="carousel-image">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt={slide.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="carousel-controls">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`carousel-dot ${index === activeSlide ? "is-active" : ""}`}
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 32 }}>
        <div className="mini-stats">
          <div className="stat-card">
            <span>Listing aktif</span>
            <strong>{totalProducts}</strong>
            <small>Oli & sparepart siap kirim</small>
          </div>
          <div className="stat-card">
            <span>Harga rata-rata</span>
            <strong>{avgPrice ? formatCurrency(avgPrice) : "-"}</strong>
            <small>Berdasarkan katalog saat ini</small>
          </div>
          <div className="stat-card">
            <span>Buffer stok</span>
            <strong>{totalStock}</strong>
            <small>Unit tersedia di gudang</small>
          </div>
        </div>
        <Form method="get" style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 280px" }}>
            Cari produk
            <input name="q" placeholder="Contoh: oli 10W-40, kampas rem, busi iridium" />
          </label>
          <label style={{ flex: "0 0 220px" }}>
            Urutkan
            <select name="sort">
              <option value="newest">Terbaru</option>
              <option value="price_low">Harga terendah</option>
              <option value="price_high">Harga tertinggi</option>
              <option value="weight">Berat</option>
            </select>
          </label>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="button primary" type="submit">
              Terapkan
            </button>
          </div>
        </Form>
      </div>

      <section style={{ marginBottom: 36 }}>
        <h3 className="section-title">Kurasi kategori</h3>
        <div className="grid three">
          {categories.map((category) => (
            <Card key={category.title} className="compact" title={category.title} subtitle={category.stat}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{category.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <div id="catalogue" className="grid three">
        {products.length ? (
          products.map((product) => (
            <Card
              key={product.id}
              className="product-card"
              title={product.name}
              subtitle={`${formatCurrency(product.price)} • ${product.weightGram} gram`}
              headerExtra={
                <Badge variant={product.stock && product.stock > 0 ? "success" : "warning"}>
                  {product.stock && product.stock > 0 ? `${product.stock} ready` : "Made to order"}
                </Badge>
              }
            >
              {product.images && product.images[0] && (
                <div style={{ 
                  marginBottom: 16, 
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  height: "140px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f3f4f6"
                }}>
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    style={{
                      maxWidth: "100%",
                      maxHeight: "140px",
                      objectFit: "cover",
                      display: "block"
                    }} 
                  />
                </div>
              )}
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
                Dimensi: {product.lengthCm ?? "-"} x {product.widthCm ?? "-"} x {product.heightCm ?? "-"} cm. Sertakan catatan servis saat checkout.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link className="button outline" to={`/product/${product.id}`}>
                  Detail produk
                </Link>
                <button 
                  className="button primary" 
                  onClick={() => handleAddToCart(product)}
                  type="button"
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Katalog masih kosong"
            description="Tambahkan data produk di Supabase terlebih dahulu. Sistem akan langsung menampilkannya di katalog begitu tersedia."
            action={isMock ? (
              <a className="button primary" href="https://supabase.com" target="_blank" rel="noreferrer">
                Buka Supabase
              </a>
            ) : null}
          />
        )}
      </div>

      <section style={{ marginTop: 36 }}>
        <h3 className="section-title">Kenapa Mitra Buana Jaya Part?</h3>
        <div className="grid three">
          {serviceHighlights.map((item) => (
            <Card key={item.title} className="compact" title={item.title}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{item.detail}</p>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}