import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import {
  LOTS, formatBid, formatCountdown, getLotLive, subscribeBids,
} from "@/lib/auction-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kalashetra — Fine Art Auctions" },
      { name: "description", content: "Curated seasonal sales of paintings, sculpture, photography, and works on paper. Bid online with confidence." },
      { property: "og:title", content: "Kalashetra — Fine Art Auctions" },
      { property: "og:description", content: "Curated seasonal sales of paintings, sculpture, photography, and works on paper." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [, force] = useState(0);
  useEffect(() => subscribeBids(() => force((n) => n + 1)), []);

  const featured = LOTS[4]; // Adaeze Okoro — Horizon, Late
  const live = getLotLive(featured.id);
  const selected = LOTS.filter((l) => l.id !== featured.id).slice(0, 6);
  const lotsCount = LOTS.length;
  const artistsCount = new Set(LOTS.map((l) => l.artist)).size;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            · Current Sale · Spring 2026
          </div>
          <h1 className="mt-8 font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight">
            Modern Masters,
            <br />
            <span className="italic font-light">Curated Editions</span>
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Ninety-two works from estates, ateliers, and private collections across four
            continents. Color-field painters, restrained draftsmen, and the rare ceramic —
            presented with full provenance, condition, and care.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              to="/auctions"
              className="bg-foreground text-background px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity"
            >
              View Catalogue
            </Link>
            <Link
              to="/about"
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works →
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-8 max-w-md">
            <Stat n={lotsCount} label="Live Lots" />
            <Stat n={artistsCount} label="Artists" />
            <Stat n={0} label="Sold to Date" />
          </div>
        </div>

        {/* Featured lot */}
        <Link to="/lot/$id" params={{ id: featured.id }} className="group block">
          <div className="aspect-[4/5] overflow-hidden bg-muted">
            <img
              src={featured.image}
              alt={`${featured.title} by ${featured.artist}`}
              width={1024}
              height={1280}
              className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
            />
          </div>
          <div className="mt-6 flex items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Featured Lot · {featured.id}
              </div>
              <h2 className="mt-3 font-serif text-2xl md:text-3xl leading-tight">
                {featured.artist} <span className="text-muted-foreground">—</span>{" "}
                <span className="italic">{featured.title}</span>
              </h2>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Current
              </div>
              <div className="mt-1.5 font-serif text-2xl">{formatBid(live.bid)}</div>
              <div className="mt-1 font-mono text-[11px] text-live">
                {formatCountdown(featured.endsInMin)}
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* SELECTED WORKS */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24">
          <div className="flex items-end justify-between gap-6 mb-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Selected Works
              </div>
              <h2 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">
                Now at Auction
              </h2>
            </div>
            <Link
              to="/auctions"
              className="hidden md:inline-block text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground border-b border-border pb-1"
            >
              All Lots →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {selected.map((lot) => {
              const l = getLotLive(lot.id);
              return (
                <Link key={lot.id} to="/lot/$id" params={{ id: lot.id }} className="group">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={lot.image}
                      alt={lot.title}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Lot · {lot.id}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-live">Live</span>
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-2xl leading-tight">{lot.artist}</h3>
                  <p className="font-serif italic text-[15px] text-muted-foreground">
                    {lot.title}, {lot.year}
                  </p>
                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    <span className="font-serif text-lg">{formatBid(l.bid)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatCountdown(lot.endsInMin)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONSIGN BAND */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10 items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              Consign with Kalashetra
            </div>
            <h2 className="mt-4 font-serif text-4xl md:text-6xl tracking-tight leading-[1.05]">
              Sell a work in the next <span className="italic">seasonal catalogue.</span>
            </h2>
          </div>
          <div className="flex md:justify-end">
            <Link
              to="/sell"
              className="border border-background px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:bg-background hover:text-foreground transition-colors"
            >
              Submit a work →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-4xl">{n}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
