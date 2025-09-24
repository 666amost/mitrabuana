import {
  Form,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useActionData,
  useLoaderData
} from "react-router";
import { Card, PageHeader } from "~/components/ui";
import { getProfile, upsertProfile } from "~/lib/db.server";
import { getSupabaseSession } from "~/lib/session.server";

interface LoaderData {
  profile: Awaited<ReturnType<typeof getProfile>>;
  userId: string;
  welcome?: boolean;
  accessDenied?: boolean;
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSupabaseSession(request);
  const url = new URL(request.url);
  const welcome = url.searchParams.get("welcome");
  const error = url.searchParams.get("error");

  if (!session?.user?.id) {
    throw redirect("/auth/simple");
  }

  const profile = await getProfile(session.user.id);

  return data<LoaderData>({
    profile,
    userId: session.user.id,
    welcome: welcome === "true",
    accessDenied: error === "access_denied"
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await getSupabaseSession(request);

  if (!session?.user?.id) {
    return data<ActionData>({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get("name")?.toString() || null;
  const phone = formData.get("phone")?.toString() || null;
  
  const address = {
    line1: formData.get("addressLine1")?.toString() || null,
    line2: formData.get("addressLine2")?.toString() || null,
    city: formData.get("city")?.toString() || null,
    province: formData.get("province")?.toString() || null,
    postalCode: formData.get("postalCode")?.toString() || null
  };

  // Only include address if at least one field is filled
  const addressToSave = Object.values(address).some(v => v) ? address : null;

  try {
    await upsertProfile(session.user.id, {
      name,
      phone,
      address: addressToSave
    });

    // Redirect to home after saving profile as requested
    return redirect("/");
  } catch (error) {
    console.error("Profile update error:", error);
    return data<ActionData>(
      { error: error instanceof Error ? error.message : "Gagal menyimpan profil" },
      { status: 500 }
    );
  }
};

export default function ProfileRoute() {
  const { profile, welcome, accessDenied } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <section>
      <PageHeader
        title="Profil Saya"
        description="Kelola informasi pribadi untuk mempercepat proses checkout."
      />

      {welcome && (
        <div className="banner" style={{ marginBottom: 24, backgroundColor: "var(--success-bg)" }}>
          <div>
            <strong>Selamat datang!</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Akun Anda telah berhasil dibuat dan dikonfirmasi. Lengkapi profil di bawah untuk mempercepat checkout selanjutnya.
            </p>
          </div>
        </div>
      )}

      {accessDenied && (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Akses Ditolak</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Anda tidak memiliki akses admin. Halaman admin hanya untuk pengguna dengan role admin.
            </p>
          </div>
        </div>
      )}

      {actionData?.success && (
        <div className="banner" style={{ marginBottom: 24, backgroundColor: "var(--success-bg)" }}>
          <div>
            <strong>Berhasil!</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>
              Profil telah diperbarui. Data ini akan otomatis mengisi form checkout selanjutnya.
            </p>
          </div>
        </div>
      )}

      {actionData?.error && (
        <div className="banner" style={{ marginBottom: 24 }}>
          <div>
            <strong>Error</strong>
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{actionData.error}</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 600 }}>
        <Card title="Informasi Pribadi">
          <Form method="post" className="grid" style={{ gap: 20 }}>
            <div className="grid form">
              <label>
                Nama lengkap
                <input 
                  name="name" 
                  type="text" 
                  defaultValue={profile?.name ?? ""} 
                  placeholder="Masukkan nama lengkap"
                />
              </label>
              <label>
                No. Telepon
                <input 
                  name="phone" 
                  type="tel" 
                  defaultValue={profile?.phone ?? ""} 
                  placeholder="08xxxxxxxx"
                />
              </label>
            </div>

            <section>
              <h3 className="section-title">Alamat Default</h3>
              <div className="grid" style={{ gap: 16 }}>
                <label>
                  Alamat 1
                  <input 
                    name="addressLine1" 
                    type="text" 
                    defaultValue={profile?.address?.line1 as string ?? ""} 
                    placeholder="Nama jalan, nomor rumah"
                  />
                </label>
                <label>
                  Alamat 2
                  <input 
                    name="addressLine2" 
                    type="text" 
                    defaultValue={profile?.address?.line2 as string ?? ""} 
                    placeholder="Kompleks, patokan, dsb"
                  />
                </label>
                <div className="grid form">
                  <label>
                    Kota/Kabupaten
                    <input 
                      name="city" 
                      type="text" 
                      defaultValue={profile?.address?.city as string ?? ""} 
                      placeholder="Jakarta"
                    />
                  </label>
                  <label>
                    Provinsi
                    <input 
                      name="province" 
                      type="text" 
                      defaultValue={profile?.address?.province as string ?? ""} 
                      placeholder="DKI Jakarta"
                    />
                  </label>
                </div>
                <label>
                  Kode pos
                  <input 
                    name="postalCode" 
                    type="text" 
                    defaultValue={profile?.address?.postalCode as string ?? ""} 
                    placeholder="12345"
                  />
                </label>
              </div>
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span className="helper-text">
                Informasi ini akan otomatis mengisi form checkout untuk kemudahan berbelanja.
              </span>
              <button type="submit" className="button primary">
                Simpan Profil
              </button>
            </div>
          </Form>
        </Card>
      </div>
    </section>
  );
}