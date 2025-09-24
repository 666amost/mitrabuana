import { Form, data, redirect, type ActionFunctionArgs } from "react-router";
import { PageHeader, Card } from "~/components/ui";
import { put } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "~/lib/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!isSupabaseConfigured()) {
    return data({ error: "Konfigurasi Supabase belum tersedia." }, { status: 400 });
  }

  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock") ?? 0);
  const files = formData.getAll("images") as File[];
  const weightGram = Number(formData.get("weightGram") ?? 0);

  if (!name || isNaN(price) || !files.length || isNaN(weightGram) || weightGram <= 0) {
    return data({ error: "Input tidak valid" }, { status: 400 });
  }

  const imageUrls: string[] = [];
  for (const file of files) {
    const safeName = (file.name ?? "file").replace(/\s+/g, "-");
    const filePath = `products/${Date.now()}-${safeName}`;
    try {
      const { url } = await put(filePath, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      });
      imageUrls.push(url);
    } catch (err) {
      console.error("Gagal mengunggah file:", err);
      return data({ error: "Gagal mengunggah file" }, { status: 500 });
    }
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabase.from("products").insert({
    name,
    price,
    stock,
    weight_gram: weightGram,
    images: imageUrls,
  });

  if (error) {
    console.error(error);
    return data({ error: "Gagal menyimpan produk" }, { status: 500 });
  }

  return redirect("/admin");
};

export default function NewProductRoute() {
  return (
    <section>
      <PageHeader title="Tambah produk" description="Tambahkan produk baru ke katalog" />
      <Card>
        <Form method="post" encType="multipart/form-data" style={{ display: "grid", gap: 12 }}>
          <label>
            Nama
            <input name="name" type="text" required />
          </label>

          <label>
            Harga
            <input name="price" type="number" min={0} required />
          </label>

          <label>
            Stok
            <input name="stock" type="number" min={0} defaultValue={0} required />
          </label>

          <label>
            Berat (gram)
            <input name="weightGram" type="number" min={1} defaultValue={100} required />
          </label>

          <label>
            Gambar produk
            <input name="images" type="file" accept="image/*" multiple required />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="button primary">Buat</button>
            <a className="button outline" href="/admin">Batal</a>
          </div>
        </Form>
      </Card>
    </section>
  );
}
