import { redirect, type LoaderFunctionArgs } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { upsertProfile, getProfile } from "~/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Supabase email links may include either `token` or `token_hash` depending on configuration.
  const token = url.searchParams.get("token") ?? url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  // Handle email confirmation
  if (type === "signup" && token) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return redirect("/auth/demo?error=config");
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
        return redirect("/auth/demo?error=confirmation_failed");
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
      return redirect("/auth/demo?error=callback_failed");
    }
  }

  // Redirect to demo if no valid callback
  return redirect("/auth/demo");
};