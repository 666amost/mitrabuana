import { redirect, type LoaderFunctionArgs } from "react-router";
import { clearSessionCookie } from "~/lib/session.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": clearSessionCookie()
    }
  });
};

export default function LogoutRoute() {
  return null;
}
