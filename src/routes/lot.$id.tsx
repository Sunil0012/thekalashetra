import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import {
  LOTS, formatBid, formatCountdown, getLotLive, placeMaxBid,
  nextMinIncrement, subscribeBids, getWatchlist, toggleWatch, subscribeWatch,
  getUser,
} from "@/lib/auction-data";

export const Route = createFileRoute("/lot/$id")({
  component: LotPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl">Lot not found</h1>
        <Link to="/" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">Back to auctions</Link>
      </div>
    </div>
  ),
});

function LotPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const lot = LOTS.find((l) => l.id === id);

  const [, force] = useState(0);
  useEffect(() => subscribeBids(() => force((n) => n + 1)), []);
  const [watch, setWatch] = useState<string[]>(getWatchlist());
  useEffect(() => subscribeWatch(() => setWatch(getWatchlist())), []);

  const [maxBid, setMaxBid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!lot) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-[1400px] px-10 py-32 text-center">
          <h1 className="font-serif text-5xl">Lot not found</h1>
          <Link to="/" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">Back to auctions</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const live = getLotLive(lot.id);
  const min = live.bid + nextMinIncrement(live.bid);
  const isWatched = watch.includes(lot.id);

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!getUser()) {
      navigate({ to: "/signin", search: { redirect: `/lot/${lot.id}` } as never });
      return;
    }
    const n = Number(maxBid.replace(/[^0-9.]/g, ""));
    if (!n || Number.isNaN(n)) { setError("Enter a numeric amount."); return; }
    const result = placeMaxBid(lot.id, n);
    if (!result.ok) { setError(result.error); return; }
    setSuccess(`Max bid placed at ${formatBid(result.newBid)}. You're the high bidder.`);
    setMaxBid("");
  };

  // Related lots
  const related = LOTS.filter((l) => l.id !== lot.id && l.category === lot.category).slice(0, 4);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8">
        <Link to="/" className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
          ← Back to auctions
        </Link>
      </div>

      <article className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="bg-muted aspect-square overflow-hidden">
          <img
            src={lot.image}
            alt={`${lot.title} by ${lot.artist}`}
            width={1024}
            height={1024}
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lot · {lot.id} · {lot.category}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-live">Live</span>
            </div>
          </div>

          <h1 className="mt-5 font-serif text-5xl md:text-6xl tracking-tight">{lot.artist}</h1>
          <p className="mt-2 font-serif italic text-2xl text-muted-foreground">{lot.title}, {lot.year}</p>

          <div className="mt-8 border-y border-border py-6 grid grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Current Bid</div>
              <div className="mt-1.5 font-serif text-3xl">{formatBid(live.bid)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{live.bidCount} bids</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Time Remaining</div>
              <div className="mt-1.5 font-serif text-3xl">{formatCountdown(lot.endsInMin)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Starting bid · {formatBid(lot.startingBid)}</div>
            </div>
          </div>

          <form onSubmit={handleBid} className="mt-8 space-y-3">
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Your maximum bid (min {formatBid(min)})
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-serif text-lg text-muted-foreground">$</span>
                <input
                  value={maxBid}
                  onChange={(e) => setMaxBid(e.target.value)}
                  inputMode="numeric"
                  placeholder={String(min)}
                  className="w-full border border-border bg-background pl-9 pr-4 py-3.5 font-serif text-lg focus:outline-none focus:border-foreground"
                />
              </div>
              <button
                type="submit"
                className="bg-foreground text-background px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
              >
                Place Bid
              </button>
            </div>
            {error && <div className="text-[12px] text-live">{error}</div>}
            {success && <div className="text-[12px] text-foreground border-l-2 border-foreground pl-3 py-1">{success}</div>}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We will bid on your behalf in minimum increments up to your maximum.
              Bids are binding. Buyer's premium of 22% applies on the hammer price.
            </p>
          </form>

          <button
            onClick={() => toggleWatch(lot.id)}
            className="mt-6 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isWatched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
            {isWatched ? "In your watchlist" : "Add to watchlist"}
          </button>

          <div className="mt-12 space-y-6 border-t border-border pt-8">
            <Detail label="Medium" value={lot.medium} />
            <Detail label="Dimensions" value={lot.dimensions} />
            <Detail label="Provenance" value={lot.provenance} />
            <Detail label="About the work" value={lot.description} />
            <Detail label="About the artist" value={lot.artistBio} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">More in {lot.category}</div>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
              {related.map((r) => {
                const rl = getLotLive(r.id);
                return (
                  <Link key={r.id} to="/lot/$id" params={{ id: r.id }} className="group">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={r.image} alt={r.title} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <h4 className="mt-4 font-serif text-lg">{r.artist}</h4>
                    <p className="font-serif italic text-sm text-muted-foreground">{r.title}, {r.year}</p>
                    <div className="mt-2 font-serif">{formatBid(rl.bid)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-[14px] leading-relaxed">{value}</div>
    </div>
  );
}
