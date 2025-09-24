import { createClient } from "@supabase/supabase-js";

export interface Session {
  user: {
    id: string;
    email: string;
    user_metadata?: any;
    app_metadata?: any;
    role?: string;
  };
  access_token: string;
}

export async function getSupabaseSession(request: Request): Promise<Session | null> {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;

  const sessionToken = cookie
    .split("; ")
    .find(row => row.startsWith("sb_session="))
    ?.split("=")[1];

  if (!sessionToken) return null;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        role: user.user_metadata?.role || user.app_metadata?.role || 'user'
      },
      access_token: sessionToken
    };
  } catch (error) {
    console.warn("Session validation failed:", error);
    return null;
  }
}

export function createSessionCookie(accessToken: string): string {
  return `sb_session=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`;
}

export function clearSessionCookie(): string {
  return "sb_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}