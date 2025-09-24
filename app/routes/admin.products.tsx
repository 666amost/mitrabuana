import { Link, data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Card, EmptyState, Badge } from "~/components/ui";
import { isSupabaseConfigured, listProducts, type Product } from "~/lib/db.server";
import { SAMPLE_PRODUCTS } from "~/lib/sample-data";

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function AdminProductsRoute() {
  const { products, isMock } = useLoaderData<typeof loader>();

  if (!products.length) {
    return (
      <EmptyState
        title="Belum ada produk"
        description="Tambahkan produk baru untuk mulai mengisi katalog Anda."
        action={<a className="button primary" href="/admin/products/new">Tambah Produk</a>}
      />
    );
  }

  return (
    <Card title="Daftar produk" subtitle={isMock ? "Menampilkan data contoh (demo mode)" : `Total ${products.length} produk`}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Berat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td data-label="Nama">{p.name}</td>
                <td data-label="Harga">{formatCurrency(p.price)}</td>
                <td data-label="Stok">
                  <Badge variant={p.stock && p.stock > 0 ? "success" : "warning"}>
                    {p.stock && p.stock > 0 ? `${p.stock} ready` : "Made to order"}
                  </Badge>
                </td>
                <td data-label="Berat">{p.weightGram} gr</td>
                <td data-label="Aksi">
                  <div className="table-actions">
                    <Link className="button ghost" to={`/product/${p.id}`}>
                      Lihat
                    </Link>
                    <a
                      className="button ghost"
                      href={`/admin/products/new?prefill=${encodeURIComponent(p.name)}`}
                    >
                      Duplikasi
                    </a>
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
