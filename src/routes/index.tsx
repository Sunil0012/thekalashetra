import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import {
  CATEGORIES, LOTS, SORTS, type Sort,
  formatBid, formatCountdown,
  getLotLive, subscribeBids,
  getWatchlist, toggleWatch, subscribeWatch,
} from "@/lib/auction-data";

type Search = { q?: string; cat?: string; sort?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  component: AuctionsPage,
});

function AuctionsPage() {
  const search = useSearch({ from: "/" });
  const cat = (CATEGORIES as readonly string[]).includes(search.cat ?? "")
    ? (search.cat as (typeof CATEGORIES)[number])
    : "All Works";
  const sort = (SORTS as readonly string[]).includes(search.sort ?? "")
    ? (search.sort as Sort)
    : "Ending Soon";
  const query = (search.q ?? "").toLowerCase().trim();

  // Subscribe to live bid changes
  const [, force] = useState(0);
  useEffect(() => subscribeBids(() => force((n) => n + 1)), []);
  const [watch, setWatch] = useState<string[]>(getWatchlist());
  useEffect(() => subscribeWatch(() => setWatch(getWatchlist())), []);

  const visible = useMemo(() => {
    let list = cat === "All Works" ? LOTS : LOTS.filter((l) => l.category === cat);
    if (query) {
      list = list.filter(
        (l) =>
          l.artist.toLowerCase().includes(query) ||
          l.title.toLowerCase().includes(query) ||
          l.category.toLowerCase().includes(query) ||
          l.id.toLowerCase().includes(query),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "Ending Soon": sorted.sort((a, b) => a.endsInMin - b.endsInMin); break;
      case "Price · High → Low": sorted.sort((a, b) => getLotLive(b.id).bid - getLotLive(a.id).bid); break;
      case "Price · Low → High": sorted.sort((a, b) => getLotLive(a.id).bid - getLotLive(b.id).bid); break;
      case "Newly Listed": sorted.sort((a, b) => a.listedAt - b.listedAt); break;
    }
    return sorted;
  }, [cat, sort, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Catalogue · Spring 2026
        </div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Current Auctions</h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {visible.length} {visible.length === 1 ? "lot" : "lots"}
          {query ? <> matching <span className="text-foreground italic">"{search.q}"</span></> : " open for bidding"}.
          Place your maximum bid — our system will increment automatically up to your ceiling.
        </p>
        {query && (
          <Link to="/" search={{}} className="mt-4 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
            Clear search
          </Link>
        )}
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORIES.map((c) => {
              const active = c === cat;
              return (
                <Link
                  key={c}
                  to="/"
                  search={(prev: Search) => ({ ...prev, cat: c === "All Works" ? undefined : c })}
                  className={
                    "px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors " +
                    (active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {c}
                </Link>
              );
            })}
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => {
                const v = e.target.value;
                const url = new URL(window.location.href);
                if (v === "Ending Soon") url.searchParams.delete("sort");
                else url.searchParams.set("sort", v);
                window.history.replaceState({}, "", url.toString());
                force((n) => n + 1);
              }}
              className="appearance-none border border-border bg-background pl-4 pr-10 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] focus:outline-none focus:border-foreground cursor-pointer"
            >
              {SORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-14">
        {visible.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <p className="font-serif text-2xl italic">No lots match this filter.</p>
            <Link to="/" search={{}} className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
              View all works
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((lot) => {
              const live = getLotLive(lot.id);
              const isWatched = watch.includes(lot.id);
              return (
                <article key={lot.id} className="group">
                  <Link to="/lot/$id" params={{ id: lot.id }} className="block relative">
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={lot.image}
                        alt={`${lot.title} by ${lot.artist}`}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="h-full w-full object-cover transition-transform duration-[800ms] group-hover:scale-[1.03]"
                      />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); toggleWatch(lot.id); }}
                      aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                      className="absolute top-3 right-3 bg-background/90 backdrop-blur p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isWatched ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
                    </button>
                  </Link>
                  <Link to="/lot/$id" params={{ id: lot.id }} className="block">
                    <div className="mt-5 flex items-center justify-between">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Lot · {lot.id}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-live">Live</span>
                      </div>
                    </div>
                    <h3 className="mt-3 font-serif text-2xl leading-tight">{lot.artist}</h3>
                    <p className="mt-1 font-serif italic text-[15px] text-muted-foreground">
                      {lot.title}, {lot.year}
                    </p>
                    <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Current Bid
                        </div>
                        <div className="mt-1.5 font-serif text-xl">{formatBid(live.bid)}</div>
                      </div>
                      <div className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                        {formatCountdown(lot.endsInMin)}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
