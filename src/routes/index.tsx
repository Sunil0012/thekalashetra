import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import lot01 from "@/assets/lot-01.jpg";
import lot02 from "@/assets/lot-02.jpg";
import lot03 from "@/assets/lot-03.jpg";
import lot04 from "@/assets/lot-04.jpg";
import lot05 from "@/assets/lot-05.jpg";
import lot06 from "@/assets/lot-06.jpg";
import lot07 from "@/assets/lot-07.jpg";
import lot08 from "@/assets/lot-08.jpg";
import lot09 from "@/assets/lot-09.jpg";

export const Route = createFileRoute("/")({
  component: AuctionsPage,
});

type Category = "Painting" | "Drawing" | "Sculpture" | "Photography" | "Print";

type Lot = {
  id: string;
  image: string;
  artist: string;
  title: string;
  year: number;
  bid: number;
  endsInMin: number;
  category: Category;
  listedAt: number;
};

const LOTS: Lot[] = [
  { id: "A41C2D", image: lot01, artist: "Noor Vasquez", title: "Combustion No. 3", year: 2024, bid: 4280, endsInMin: 1 * 1440 + 9 * 60 + 53, category: "Painting", listedAt: 9 },
  { id: "73B19E", image: lot02, artist: "Helene Marchetti", title: "Three Poppies", year: 2023, bid: 1100, endsInMin: 1 * 1440 + 21 * 60 + 12, category: "Drawing", listedAt: 7 },
  { id: "5F0A88", image: lot03, artist: "Tomás Aldana", title: "Vessel for Wind", year: 2024, bid: 9650, endsInMin: 2 * 1440 + 9 * 60 + 5, category: "Sculpture", listedAt: 4 },
  { id: "C2DE10", image: lot04, artist: "Yuki Harada", title: "Watcher in Fog", year: 2022, bid: 3400, endsInMin: 2 * 1440 + 21 * 60 + 40, category: "Photography", listedAt: 6 },
  { id: "9B44A7", image: lot05, artist: "Adaeze Okoro", title: "Horizon, Late", year: 2025, bid: 12800, endsInMin: 3 * 1440 + 4 * 60, category: "Painting", listedAt: 12 },
  { id: "1E77F3", image: lot06, artist: "Ren Kobayashi", title: "Tidefall, Indigo", year: 2024, bid: 2750, endsInMin: 4 * 1440 + 2 * 60, category: "Print", listedAt: 2 },
  { id: "6A21B5", image: lot07, artist: "Salim Farouk", title: "Letters to a Bird", year: 2023, bid: 5400, endsInMin: 5 * 1440 + 11 * 60, category: "Painting", listedAt: 5 },
  { id: "30FF8C", image: lot08, artist: "Iona Berglund", title: "Drip Study, Celadon", year: 2024, bid: 2100, endsInMin: 6 * 1440 + 6 * 60, category: "Sculpture", listedAt: 10 },
  { id: "B8C402", image: lot09, artist: "Pietro Casal", title: "Ruins at Ostia", year: 2022, bid: 1850, endsInMin: 7 * 1440 + 1 * 60, category: "Drawing", listedAt: 3 },
];

const CATEGORIES: ("All Works" | Category)[] = ["All Works", "Painting", "Drawing", "Sculpture", "Photography", "Print"];
const SORTS = ["Ending Soon", "Price · High → Low", "Price · Low → High", "Newly Listed"] as const;

function formatBid(n: number) {
  return "$" + n.toLocaleString("en-US");
}

function formatCountdown(min: number) {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function AuctionsPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All Works");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Ending Soon");

  const visible = useMemo(() => {
    const filtered = cat === "All Works" ? LOTS : LOTS.filter((l) => l.category === cat);
    const sorted = [...filtered];
    switch (sort) {
      case "Ending Soon": sorted.sort((a, b) => a.endsInMin - b.endsInMin); break;
      case "Price · High → Low": sorted.sort((a, b) => b.bid - a.bid); break;
      case "Price · Low → High": sorted.sort((a, b) => a.bid - b.bid); break;
      case "Newly Listed": sorted.sort((a, b) => a.listedAt - b.listedAt); break;
    }
    return sorted;
  }, [cat, sort]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-8 px-10 py-7">
          <nav className="flex items-center gap-10 text-[11px] font-medium uppercase tracking-[0.18em]">
            <a href="#" className="text-foreground">Auctions</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Artists</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Sell</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          </nav>
          <div className="text-center">
            <div className="font-serif text-3xl tracking-tight leading-none">Vermillion</div>
            <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Fine Art Auctions · Est. 2026
            </div>
          </div>
          <div className="flex items-center justify-end gap-5">
            <div className="hidden md:flex items-center gap-2 border-b border-border pb-1.5 w-64">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                placeholder="Search lots, artists"
                className="bg-transparent text-[11px] uppercase tracking-[0.18em] placeholder:text-muted-foreground focus:outline-none w-full"
              />
            </div>
            <button className="border border-foreground px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Catalogue intro */}
      <section className="mx-auto max-w-[1400px] px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Catalogue · Spring 2026
        </div>
        <h1 className="font-serif text-7xl tracking-tight mt-6">Current Auctions</h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {LOTS.length} lots open for bidding. Place your maximum bid — our system will increment
          automatically up to your ceiling.
        </p>
      </section>

      {/* Filter / sort bar */}
      <section className="mx-auto max-w-[1400px] px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORIES.map((c) => {
              const active = c === cat;
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={
                    "px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors " +
                    (active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className="appearance-none border border-border bg-background pl-4 pr-10 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] focus:outline-none focus:border-foreground"
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-[1400px] px-10 py-14">
        <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((lot) => (
            <article key={lot.id} className="group cursor-pointer">
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
                  <div className="mt-1.5 font-serif text-xl">{formatBid(lot.bid)}</div>
                </div>
                <div className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                  {formatCountdown(lot.endsInMin)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="mx-auto max-w-[1400px] px-10 py-12 flex flex-wrap items-center justify-between gap-6">
          <div className="font-serif text-xl">Vermillion</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            © 2026 · Bids placed in USD · Buyer's premium 22%
          </div>
        </div>
      </footer>
    </div>
  );
}
