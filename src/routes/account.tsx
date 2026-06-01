import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import {
  LOTS, getLotLive, formatBid, formatCountdown,
  getWatchlist, subscribeWatch, toggleWatch,
  getUser, subscribeAuth,
} from "@/lib/auction-data";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Vermillion" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [watch, setWatch] = useState<string[]>(getWatchlist());

  useEffect(() => subscribeAuth(() => setUser(getUser())), []);
  useEffect(() => subscribeWatch(() => setWatch(getWatchlist())), []);

  useEffect(() => {
    if (!user) navigate({ to: "/signin", search: { redirect: "/account" } as never });
  }, [user, navigate]);

  if (!user) return null;

  const watchedLots = LOTS.filter((l) => watch.includes(l.id));
  const yourBids = LOTS.filter((l) => getLotLive(l.id).yourMax);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Account</div>
        <h1 className="font-serif text-5xl md:text-6xl tracking-tight mt-6">Welcome, {user.name.split(" ")[0]}.</h1>
        <p className="mt-4 text-[14px] text-muted-foreground">{user.email}</p>
      </section>

      <Section title="Your bids" empty="You haven't placed any bids yet.">
        {yourBids.map((l) => {
          const live = getLotLive(l.id);
          const winning = live.bid === live.yourMax;
          return (
            <Link key={l.id} to="/lot/$id" params={{ id: l.id }} className="grid grid-cols-[80px_1fr_auto_auto] gap-6 items-center py-5 border-b border-border group">
              <div className="w-20 h-20 bg-muted overflow-hidden">
                <img src={l.image} alt={l.title} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-serif text-lg">{l.artist}</div>
                <div className="font-serif italic text-[13px] text-muted-foreground">{l.title}, {l.year}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Your max</div>
                <div className="font-serif text-lg">{formatBid(live.yourMax!)}</div>
              </div>
              <div className="text-right">
                <div className={"font-mono text-[10px] uppercase tracking-[0.18em] " + (winning ? "text-foreground" : "text-live")}>
                  {winning ? "Winning" : "Outbid"}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">{formatCountdown(l.endsInMin)}</div>
              </div>
            </Link>
          );
        })}
      </Section>

      <Section title="Watchlist" empty="No lots in your watchlist.">
        {watchedLots.map((l) => {
          const live = getLotLive(l.id);
          return (
            <div key={l.id} className="grid grid-cols-[80px_1fr_auto_auto] gap-6 items-center py-5 border-b border-border">
              <Link to="/lot/$id" params={{ id: l.id }} className="w-20 h-20 bg-muted overflow-hidden">
                <img src={l.image} alt={l.title} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover" />
              </Link>
              <Link to="/lot/$id" params={{ id: l.id }}>
                <div className="font-serif text-lg">{l.artist}</div>
                <div className="font-serif italic text-[13px] text-muted-foreground">{l.title}, {l.year}</div>
              </Link>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Current</div>
                <div className="font-serif text-lg">{formatBid(live.bid)}</div>
              </div>
              <button
                onClick={() => toggleWatch(l.id)}
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Remove
              </button>
            </div>
          );
        })}
      </Section>

      <SiteFooter />
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 border-t border-border">
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="mt-6">
        {isEmpty ? (
          <p className="text-[14px] text-muted-foreground italic py-8">{empty}</p>
        ) : children}
      </div>
    </section>
  );
}
