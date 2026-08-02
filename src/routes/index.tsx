import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { getCatalogue } from "@/lib/auction.functions";
import { formatBid, formatCountdown } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

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
  useNow(30_000);
  const fn = useServerFn(getCatalogue);
  const { data, isLoading } = useQuery({ queryKey: ["catalogue"], queryFn: () => fn() });

  const lots = data?.lots ?? [];
  const sessions = data?.sessions ?? [];
  const sessionsById: Record<string, any> = data?.sessionsById ?? {};
  const liveSessions = sessions.filter((s: any) => s.status === "live");

  const featured = lots[0];
  const selected = lots.slice(1, 7);
  const artistsCount = new Set(lots.map((l: any) => l.artist)).size;
  const soldCount = lots.filter((l: any) => l.status === "sold").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {liveSessions.length > 0 ? <>· Live Now · {liveSessions[0].title}</> : "· Fine Art Auctions"}
          </div>
          <h1 className="mt-8 font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight">
            Modern Masters,
            <br />
            <span className="italic font-light">Curated Editions</span>
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Works from estates, ateliers, and private collections — presented with full
            provenance, condition, and care. Every sale is a timed session: bid until the
            clock runs out.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              to="/auctions"
              className="bg-foreground text-background px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity"
            >
              View Catalogue
            </Link>
            <Link
              to="/live"
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Live bidding slots →
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-8 max-w-md">
            <Stat n={lots.length} label="Live Lots" />
            <Stat n={artistsCount} label="Artists" />
            <Stat n={soldCount} label="Sold" />
          </div>
        </div>

        {/* Featured lot */}
        {featured ? (
          <Link to="/lot/$id" params={{ id: featured.id }} className="group block">
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img
                src={featured.image_url ?? ""}
                alt={`${featured.title} by ${featured.artist}`}
                width={1024}
                height={1280}
                className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
              />
            </div>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Featured Lot · No. {featured.lot_number}
                </div>
                <h2 className="mt-3 font-serif text-2xl md:text-3xl leading-tight">
                  {featured.artist} <span className="text-muted-foreground">—</span>{" "}
                  <span className="italic">{featured.title}</span>
                </h2>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current</div>
                <div className="mt-1.5 font-serif text-2xl">{formatBid(featured.current_bid)}</div>
                <div className="mt-1 font-mono text-[11px] text-live">
                  {formatCountdown(sessionsById[featured.session_id]?.ends_at)}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="aspect-[4/5] border border-border flex flex-col items-center justify-center text-center p-10">
            {isLoading ? (
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Loading catalogue…</div>
            ) : (
              <>
                <p className="font-serif text-2xl italic">No live session at the moment.</p>
                <Link to="/live" className="mt-6 text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
                  See live bidding slots →
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      {/* SELECTED WORKS */}
      {selected.length > 0 && (
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24">
            <div className="flex items-end justify-between gap-6 mb-12">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Selected Works</div>
                <h2 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">Now at Auction</h2>
              </div>
              <Link to="/auctions" className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground shrink-0">
                Full catalogue →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {selected.map((l: any) => (
                <Link key={l.id} to="/lot/$id" params={{ id: l.id }} className="group block">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={l.image_url ?? ""}
                      alt={`${l.title} by ${l.artist}`}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-serif text-lg leading-snug">{l.artist}</div>
                      <div className="font-serif italic text-[13px] text-muted-foreground">{l.title}{l.year ? `, ${l.year}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-lg">{formatBid(l.current_bid)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{l.bid_count} bids</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-3xl">{n}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}
