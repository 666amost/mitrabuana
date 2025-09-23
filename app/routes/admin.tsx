import { PageHeader } from "~/components/ui";
import { Outlet } from "react-router";

export default function AdminLayout() {
  return (
    <section>
      <PageHeader
        title="Panel Admin"
        description="Kelola order masuk, verifikasi pembayaran, dan update nomor resi dari satu tempat."
        actions={
          <nav style={{ display: "flex", gap: 12 }}>
            <a className="button outline" href="/admin">
              Order Masuk
            </a>
          </nav>
        }
      />
      <Outlet />
    </section>
  );
}
