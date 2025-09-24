import { redirect, type LoaderFunctionArgs } from "react-router";
import { getSupabaseSession } from "~/lib/session.server";
import { getProfile } from "~/lib/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSupabaseSession(request);

  if (!session?.user?.id) {
    throw redirect("/auth/simple");
  }

  // Check if user has admin role (prefer profiles table)
  const profile = await getProfile(session.user.id);
  const userRole = profile?.role || session.user.role || 'user';

  if (userRole !== 'admin') {
    // Regular user, redirect to profile with error
    throw redirect("/profile?error=access_denied");
  }

  // Admin user, continue to admin dashboard
  return redirect("/admin");
};