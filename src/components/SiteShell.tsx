import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Shield } from "lucide-react";

export function SiteHeader() {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [q, setQ] = useState("");
  const { user, isAdmin } = useAuth();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/auctions", search: { q: q.trim() || undefined } as never });
  };

  const navItems = [
    { to: "/auctions", label: "Auctions" },
    { to: "/live", label: "Live Bidding" },
    { to: "/dispatch", label: "Dispatch" },
    { to: "/sell", label: "Sell" },
    { to: "/about", label: "About" },
  ];


  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-8 px-6 py-7 md:px-10">
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-medium uppercase tracking-[0.18em]">
          {navItems.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={active ? "text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link to="/" className="text-center">
          <div className="font-serif text-3xl tracking-tight leading-none">Kalashetra</div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Fine Art Auctions · Est. 2026
          </div>
        </Link>
        <div className="flex items-center justify-end gap-4">
          <form onSubmit={onSubmit} className="hidden md:flex items-center gap-2 border-b border-border pb-1.5 w-56">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lots, artists" className="bg-transparent text-[11px] uppercase tracking-[0.18em] placeholder:text-muted-foreground focus:outline-none w-full" />
          </form>
          {isAdmin && (
            <Link to="/admin" className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground hover:opacity-70">
              <Shield className="size-3.5" /> Admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/account" className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                Account
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
                className="border border-foreground px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/auth" className="border border-foreground px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
      <div className="md:hidden border-t border-border">
        <nav className="mx-auto max-w-[1400px] px-6 py-3 flex items-center gap-6 overflow-x-auto text-[11px] font-medium uppercase tracking-[0.18em]">
          {navItems.map((n) => (
            <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-foreground whitespace-nowrap">{n.label}</Link>
          ))}
          {isAdmin && <Link to="/admin" className="text-foreground whitespace-nowrap">Admin</Link>}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="font-serif text-2xl">Kalashetra</Link>
          <p className="mt-3 text-[12px] text-muted-foreground max-w-sm leading-relaxed">
            A curated fine art auction house in India. Live & timed sessions for paintings, drawings, prints, and mixed media.
          </p>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground mb-3">Auctions</div>
          <ul className="space-y-2 text-[13px]">
            <li><Link to="/auctions" className="hover:opacity-70">Live now</Link></li>
            <li><Link to="/live" className="hover:opacity-70">Live bidding slots</Link></li>

          </ul>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground mb-3">Company</div>
          <ul className="space-y-2 text-[13px]">
            <li><Link to="/about" className="hover:opacity-70">About</Link></li>
            <li><Link to="/dispatch" className="hover:opacity-70">The Dispatch</Link></li>
            <li><Link to="/sell" className="hover:opacity-70">Sell with us</Link></li>
            <li><Link to="/request-admin" className="hover:opacity-70">Become admin</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground mb-3">Contact</div>
          <ul className="space-y-2 text-[13px]">
            <li><a href="mailto:sunilnaikkethavath@gmail.com" className="hover:opacity-70">sunilnaikkethavath@gmail.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>© 2026 Kalashetra</span>
          <span>Bids in INR · Buyer's premium 22% · 10% commission</span>
        </div>
      </div>
    </footer>
  );
}
