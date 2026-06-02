import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUser, signOut, subscribeAuth } from "@/lib/auction-data";

export function SiteHeader() {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [q, setQ] = useState("");
  const [user, setUser] = useState(getUser());

  useEffect(() => subscribeAuth(() => setUser(getUser())), []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/auctions", search: { q: q.trim() || undefined } as never });
  };

  const navItems = [
    { to: "/auctions", label: "Auctions" },
    { to: "/artists", label: "Artists" },
    { to: "/sell", label: "Sell" },
    { to: "/about", label: "About" },
  ];

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-8 px-6 py-7 md:px-10">
        <nav className="hidden md:flex items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em]">
          {navItems.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={active ? "text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link to="/" className="text-center">
          <div className="font-serif text-3xl tracking-tight leading-none">Vermillion</div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Fine Art Auctions · Est. 2026
          </div>
        </Link>
        <div className="flex items-center justify-end gap-5">
          <form onSubmit={onSubmit} className="hidden md:flex items-center gap-2 border-b border-border pb-1.5 w-64">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lots, artists"
              className="bg-transparent text-[11px] uppercase tracking-[0.18em] placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </form>
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/account" className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={() => signOut()}
                className="border border-foreground px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="border border-foreground px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
      <div className="md:hidden border-t border-border">
        <nav className="mx-auto max-w-[1400px] px-6 py-3 flex items-center gap-6 overflow-x-auto text-[11px] font-medium uppercase tracking-[0.18em]">
          {navItems.map((n) => (
            <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-foreground whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 flex flex-wrap items-center justify-between gap-6">
        <Link to="/" className="font-serif text-xl">Vermillion</Link>
        <nav className="flex flex-wrap gap-6 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/sell" className="hover:text-foreground">Consign</Link>
          <Link to="/artists" className="hover:text-foreground">Artists</Link>
          <a href="mailto:hello@vermillion.art" className="hover:text-foreground">Contact</a>
        </nav>
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          © 2026 · Bids in USD · Buyer's premium 22%
        </div>
      </div>
    </footer>
  );
}
