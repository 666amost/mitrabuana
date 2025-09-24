import {
  Form,
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useActionData,
  useSearchParams
} from "react-router";
import { useState } from "react";
import { Card, PageHeader } from "~/components/ui";
import { createClient } from "@supabase/supabase-js";
import { upsertProfile, getProfile } from "~/lib/db.server";

interface ActionData {
  error?: string;
  success?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  
  return data({ 
    error: error === "confirmation_failed" ? "Email confirmation failed. Please try again." : null 
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return data<ActionData>({ error: "Supabase configuration missing" }, { status: 500 });
  }

  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const actionType = formData.get("actionType")?.toString();

  if (!email || !password) {
    return data<ActionData>({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    if (actionType === "signup") {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${new URL(request.url).origin}/auth/callback`
        }
      });

      if (error) {
        return data<ActionData>({ error: error.message }, { status: 400 });
      }

      return data<ActionData>({ 
        success: "Pendaftaran berhasil! Silakan cek email untuk mengkonfirmasi akun Anda." 
      });
    } else {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return data<ActionData>({ error: error.message }, { status: 400 });
      }

      if (authData.session && authData.user) {
        // Ensure profile exists; do not override existing role
        try {
          const existing = await getProfile(authData.user.id);
          if (!existing) {
            await upsertProfile(authData.user.id, {
              name: authData.user.email?.split("@")[0] || null,
              phone: null,
              address: null,
              role: 'customer' // default for brand-new profile
            });
          } else {
            // Update basic info without touching role
            await upsertProfile(authData.user.id, {
              name: (existing.name ?? (authData.user.email?.split("@")[0] || null)),
              phone: existing.phone ?? null,
              address: (existing.address as any) ?? null
            });
          }
        } catch (profileError) {
          console.warn("Failed to ensure profile exists:", profileError);
        }

        // Get profile to check role from database
        let redirectTo = '/dashboard';
        try {
          const profile = await getProfile(authData.user.id);
          if (profile?.role === 'admin') {
            redirectTo = '/admin';
          }
        } catch (error) {
          console.warn("Failed to get profile for redirect:", error);
        }
        
        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTo,
            "Set-Cookie": `sb_session=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
          }
        });
      }
    }
  } catch (error: any) {
    return data<ActionData>({ error: error.message }, { status: 500 });
  }

  return data<ActionData>({ error: "Something went wrong" }, { status: 500 });
};

export default function AuthRoute() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const loaderData = useActionData() as any;
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <section>
      <PageHeader
        title="Masuk ke Akun"
        description="Masuk atau buat akun baru untuk menyimpan profil dan mempercepat checkout."
      />

      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <Card>
          {/* Tab Navigation */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            marginBottom: 24
          }}>
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                background: "none",
                borderBottom: activeTab === "signin" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "signin" ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: activeTab === "signin" ? "600" : "400",
                cursor: "pointer",
                fontSize: 16
              }}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                background: "none",
                borderBottom: activeTab === "signup" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "signup" ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: activeTab === "signup" ? "600" : "400",
                cursor: "pointer",
                fontSize: 16
              }}
            >
              Daftar
            </button>
          </div>

          {/* Error/Success Messages */}
          {(actionData?.error || loaderData?.error) && (
            <div className="banner" style={{ marginBottom: 20 }}>
              <div>
                <strong>Error</strong>
                <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                  {actionData?.error || loaderData?.error}
                </p>
              </div>
            </div>
          )}

          {actionData?.success && (
            <div className="banner" style={{ marginBottom: 20, backgroundColor: "var(--success-bg)" }}>
              <div>
                <strong>Berhasil!</strong>
                <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                  {actionData.success}
                </p>
              </div>
            </div>
          )}

          {/* Auth Form */}
          <Form method="post" className="grid" style={{ gap: 16 }}>
            <input type="hidden" name="actionType" value={activeTab} />
            
            <label>
              Email
              <input name="email" type="email" required placeholder="nama@email.com" />
            </label>
            
            <label>
              Password
              <input 
                name="password" 
                type="password" 
                required 
                minLength={6} 
                placeholder={activeTab === "signup" ? "Minimal 6 karakter" : "Masukkan password"}
              />
              {activeTab === "signup" && (
                <span className="helper-text">Password minimal 6 karakter</span>
              )}
            </label>

            <button type="submit" className="button primary" style={{ marginTop: 8 }}>
              {activeTab === "signin" ? "Masuk" : "Daftar"}
            </button>
          </Form>

          {/* Additional Info */}
          <div style={{ 
            textAlign: "center", 
            marginTop: 20, 
            padding: "16px 0", 
            borderTop: "1px solid var(--border)",
            fontSize: 14,
            color: "var(--text-secondary)"
          }}>
            {activeTab === "signin" ? (
              <p>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  Daftar di sini
                </button>
              </p>
            ) : (
              <p>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  Masuk di sini
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}