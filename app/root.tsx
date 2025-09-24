import { useState } from "react";
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, data, useLoaderData, Link } from "react-router";
import { Badge } from "~/components/ui";
import { BottomNavBar } from "~/components/BottomNavBar";
import { CartProvider, useCart } from "~/lib/cart";
import stylesheetUrl from "~/styles/global.css?url";
import { getSupabaseSession } from "~/lib/session.server";
import { getProfile } from "~/lib/db.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheetUrl }];

export const meta: MetaFunction = () => [{ title: "Mitra Buana Jaya Part — Premium Motor Oil & Parts" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const envReady = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
  const session = await getSupabaseSession(request);
  const profile = session?.user?.id ? await getProfile(session.user.id) : null;

  return data({ 
    pathname: url.pathname, 
    envReady,
    auth: {
      loggedIn: Boolean(session?.user?.id),
      userId: session?.user?.id || null,
      // Prefer role from profiles table; fallback to session metadata if available
      role: (profile?.role as string | undefined) || (session?.user?.role as string | undefined) || 'customer'
    },
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  });
};

function CartButton() {
  const { totalItems } = useCart();
  
  return (
    <Link className="button cart-button" to="/checkout" title="Keranjang">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="m1 1 4 4 2.68 11.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 7H6"></path>
      </svg>
      {totalItems > 0 && (
        <span className="cart-counter">{totalItems}</span>
      )}
    </Link>
  );
}

function AppContent() {
  const { pathname, envReady, env, auth } = useLoaderData<typeof loader>();
  const [navOpen, setNavOpen] = useState(false);

  const dashboardHref = auth?.role === 'admin' ? '/admin' : '/dashboard';
  const navItems = [
    { label: "Katalog", href: "/" },
    { label: "Checkout", href: "/checkout" },
    { label: "Lacak", href: "/lacak/demo-awb" },
    auth?.loggedIn ? { label: "Dashboard", href: dashboardHref } : { label: "Profil", href: "/profile" }
  ];

  const normalize = (href: string) => (href === "/" ? href : `${href}/`);

  function handleNavLinkClick() {
    setNavOpen(false);
  }

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="brand">
                <Badge variant="neutral" className="brand-badge">
                  Mitra Buana Jaya Part
                </Badge>
                <div className="brand-info">
                  <strong>Premium Motor Oil & Parts</strong>
                  <small style={{ color: "var(--text-muted)" }}>Distributor unggulan untuk bengkel & enthusiast</small>
                </div>
              </div>

              <div className="nav-wrapper">
                <button
                  className="mobile-nav-toggle"
                  type="button"
                  onClick={() => setNavOpen((prev) => !prev)}
                  aria-expanded={navOpen}
                  aria-label={navOpen ? "Tutup navigasi" : "Buka navigasi"}
                >
                  {/* Hamburger / Close icons */}
                  {navOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 18L18 6M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <nav className={`nav-links ${navOpen ? "is-open" : ""}`}>
                  {navItems.map((item) => {
                    const active = pathname === item.href || normalize(pathname).startsWith(normalize(item.href));
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`nav-link${active ? " is-active" : ""}`}
                        onClick={handleNavLinkClick}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className={`nav-actions ${navOpen ? "is-open" : ""}`}>
                  {/* Cart button for mobile - marketplace style */}
                  <CartButton />
                  {auth?.loggedIn ? (
                    <Link className="button" to="/logout">Keluar</Link>
                  ) : (
                    <Link className="button" to="/auth/simple">Masuk</Link>
                  )}
                  <Link className="button primary" to="/checkout" style={{ display: 'none' }}>
                    Checkout
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <main className="content-shell app-main">
            {!envReady ? (
              <div className="banner">
                <div>
                  <strong>Mode demonstrasi</strong>
                  <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                    Isi variabel Supabase & Vercel Blob di file <code>.env</code> untuk mengaktifkan katalog asli, checkout, dan invoice otomatis.
                  </p>
                </div>
                <a className="button ghost" href="https://supabase.com" target="_blank" rel="noreferrer">
                  Integrasikan Supabase
                </a>
              </div>
            ) : null}

            <Outlet />

            <footer className="footer-note">
              &copy; {new Date().getFullYear()} Mitra Buana Jaya Part. Solusi aftersales modern untuk oli & sparepart motor.
            </footer>
          </main>
          
          <BottomNavBar />
        </div>
        <ScrollRestoration />
        <script 
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)};`
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}