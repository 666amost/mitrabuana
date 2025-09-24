import { redirect, type LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { upsertProfile, getProfile } from "~/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Supabase email links may include either `token` or `token_hash` depending on configuration.
  const token = url.searchParams.get("token") ?? url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  // When Supabase redirects with a URL hash fragment (e.g. #access_token=...),
  // our client code below will convert it to a query param `access_token`.
  const accessToken = url.searchParams.get("access_token");

  // Handle email confirmation via token/token_hash (email OTP style)
  if (type === "signup" && token) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return redirect("/auth/simple?error=config");
    }

    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      // `verifyOtp` expects the token value; pass the token param we extracted.
      // Cast to any to satisfy TypeScript overloads — at runtime Supabase accepts token/token_hash.
      const { data, error } = await supabase.auth.verifyOtp(({
        token,
        type: 'signup'
      } as unknown) as any);
      
      if (error) {
        console.error("Email confirmation error:", error);
        return redirect("/auth/simple?error=confirmation_failed");
      }

      if (data.user) {
        // Create profile for confirmed user
        try {
          await upsertProfile(data.user.id, {
            name: data.user.email?.split("@")[0] || null,
            phone: null,
            address: null,
            role: 'customer'
          });
        } catch (profileError) {
          console.warn("Failed to create profile:", profileError);
        }

        // Get profile to check role from database
        let redirectTo = '/dashboard';
        try {
          const profile = await getProfile(data.user.id);
          if (profile?.role === 'admin') {
            redirectTo = '/admindashboard';
          }
        } catch (error) {
          console.warn("Failed to get profile for redirect:", error);
        }

        // Set session cookie
        const response = new Response(null, {
          status: 302,
          headers: {
            Location: redirectTo,
            "Set-Cookie": `sb_session=${data.session?.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
          }
        });

        return response;
      }
    } catch (error) {
      console.error("Auth callback error:", error);
      return redirect("/auth/simple?error=callback_failed");
    }
  }

  // Handle redirect that contains a full access token
  if (accessToken) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return redirect("/auth/simple?error=config");
    }

    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error || !user) {
        console.error("Failed to fetch user from access token:", error);
        return redirect("/auth/simple?error=callback_failed");
      }

      // Ensure profile exists
      try {
        const prof = await getProfile(user.id);
        if (!prof) {
          await upsertProfile(user.id, {
            name: user.email?.split("@")[0] || null,
            phone: null,
            address: null,
            role: 'customer'
          });
        }
      } catch (profileErr) {
        console.warn("Failed to ensure profile:", profileErr);
      }

      // Resolve redirect target
      let redirectTo = '/dashboard';
      try {
        const profile = await getProfile(user.id);
        if (profile?.role === 'admin') {
          redirectTo = '/admindashboard';
        }
      } catch {}

      // Set session cookie and redirect
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: redirectTo,
          "Set-Cookie": `sb_session=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`
        }
      });
      return response;
    } catch (e) {
      console.error("Auth callback (access_token) error:", e);
      return redirect("/auth/simple?error=callback_failed");
    }
  }

  // Redirect to auth page if no valid callback
  return redirect("/auth/simple");
};

export default function AuthCallback() {
  // In case Supabase delivered credentials via URL hash (e.g., #access_token=...),
  // convert it to query params so the server-side loader can set HttpOnly cookies.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hash, pathname, search } = window.location;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      // Preserve existing search query (e.g., type=signup)
      const existing = new URLSearchParams(search);
      params.forEach((value, key) => existing.set(key, value));
      const target = `${pathname}?${existing.toString()}`;
      // Replace to avoid keeping the token in browser history
      window.location.replace(target);
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <p>Mengonfirmasi akun Anda, mohon tunggu…</p>
    </div>
  );
}