# 🛒 WebApp Arsitektur — E-Commerce Mini (Remix + Supabase + Vercel Blob)

## 🎯 Tujuan
- Menjual produk custom (3D print / figur / aksesori).
- User bisa checkout → keluar **invoice PDF** (QRIS statis / transfer manual).
- Admin bisa verifikasi pembayaran → input resi (manual dari counter).
- Estimasi ongkir **otomatis** via rate card offline (tanpa API berbayar).
- User bisa tracking status order dan resi.

---

## 🏗️ Tech Stack

- **Frontend & Backend**: [Remix](https://remix.run/) (deploy di **Vercel**)
- **Database & Auth**: [Supabase](https://supabase.com/) (Postgres + Row Level Security)
- **File Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)  
  → untuk simpan **invoice PDF** & **bukti transfer**.
- **Admin Dashboard**: Remix route `app/routes/admin.*`
- **Styling**: TailwindCSS

---

## 📂 Struktur Project

```
app/
 ├── routes/
 │    ├── index.tsx            # halaman katalog produk
 │    ├── product.$id.tsx      # detail produk
 │    ├── checkout.tsx         # form checkout
 │    ├── invoice.$id.tsx      # tampilkan invoice PDF link
 │    ├── lacak.$awb.tsx       # tracking resi
 │    └── admin/
 │         ├── index.tsx       # dashboard order
 │         └── orders.$id.tsx  # detail + verifikasi bayar
 ├── lib/
 │    ├── db.server.ts         # koneksi Supabase
 │    ├── shipping.server.ts   # hitung ongkir offline
 │    └── invoice.server.ts    # generate PDF invoice
 ├── components/
 │    └── ...
```

---

## 🗄️ Skema Database (Supabase)

(Lihat detail tabel di dokumen utama)
