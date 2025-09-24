import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function registerUser(email: string, password: string, role: "customer" | "admin" = "customer") {
  // create user using admin API
  const resp = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { role }
  });

  if (resp.error) {
    throw resp.error;
  }

  // supabase-js admin.createUser returns { data: { user }, error }
  return resp.data?.user ?? null;
}

export async function loginUser(email: string, password: string) {
  // sign in and return session + user
  const resp = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (resp.error) {
    throw resp.error;
  }
  return resp;
}

export function parseCookies(request: Request) {
  const header = request.headers.get("cookie") || "";
  return header.split(";").map((c) => c.trim()).filter(Boolean).reduce<Record<string,string>>((acc, pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return acc;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    acc[key] = decodeURIComponent(val);
    return acc;
  }, {});
}

export function createSessionCookieHeader(userId: string, role: string | undefined) {
  // store minimal info in cookie, base64 encoded to avoid special chars
  const payload = Buffer.from(JSON.stringify({ id: userId, role })).toString("base64");
  // HttpOnly cookie
  const cookie = `sb_user=${encodeURIComponent(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`;
  return cookie;
}

export function clearSessionCookieHeader() {
  return `sb_user=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function decodeSessionCookie(value?: string) {
  if (!value) return null;
  try {
    const decoded = Buffer.from(decodeURIComponent(value), "base64").toString("utf8");
    return JSON.parse(decoded) as { id: string; role?: string };
  } catch {
    return null;
  }
}
