import { redirect, type ActionFunctionArgs } from "react-router";
import { clearSessionCookieHeader } from "~/lib/auth.server";

export const action = async () => {
  return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": clearSessionCookieHeader() } });
};

export default function LogoutRoute() {
  // This route only uses action; render fallback
  return <p>Logging out…</p>;
}
