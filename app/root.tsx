import { useState } from "react";
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, data, useLoaderData, Link } from "react-router";
import { Badge } from "~/components/ui";
import { BottomNavBar } from "~/components/BottomNavBar";
import stylesheetUrl from "~/styles/global.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheetUrl }];

export const meta: MetaFunction = () => [{ title: "Mitra Buana Jaya Part — Premium Motor Oil & Parts" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const envReady = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));

  return data({ pathname: url.pathname, envReady });
};

export default function App() {
  const { pathname, envReady } = useLoaderData<typeof loader>();
  const [navOpen, setNavOpen] = useState(false);

  const navItems = [
    { label: "Katalog", href: "/" },
    { label: "Checkout", href: "/checkout" },
    { label: "Lacak", href: "/lacak/demo-awb" },
    { label: "Admin", href: "/admin" }
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
                  <a className="button outline" href="mailto:sales@mitrabuana.part">
                    Hubungi Sales
                  </a>
                  <Link className="button primary" to="/checkout">
                    Paket Servis
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
        <Scripts />
      </body>
    </html>
  );
}