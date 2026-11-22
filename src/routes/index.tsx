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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalogue"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const lots = data?.lots ?? [];
  const sessions = data?.sessions ?? [];
  const sessionsById: Record<string, any> = data?.sessionsById ?? {};
  const liveSessions = sessions.filter((s: any) => s.status === "live");

  const featured = lots[0];
  const selected = lots.slice(1, 7);
  const artistsCount = new Set(lots.map((l: any) => l.artist)).size;
  const soldCount = lots.filter((l: any) => l.status === "sold").length;
  const catalogueCount = lots.length;

  // getCatalogue returns database rows in snake_case. Keep the homepage resilient
  // to older camelCase responses too, and use the bundled artwork if a remote image
  // is missing or unavailable.
  const lotImage = (lot: any) => lot.image_url ?? lot.imageUrl ?? `/lots/lot-${String(((lot.lot_number ?? lot.lotNumber ?? 1) - 1) % 9 + 1).padStart(2, "0")}.jpg`;
  const lotCurrentBid = (lot: any) => lot.current_bid ?? lot.currentBid ?? lot.starting_bid ?? 0;
  const lotNumber = (lot: any) => lot.lot_number ?? lot.lotNumber ?? "—";
  const lotBidCount = (lot: any) => lot.bid_count ?? lot.bidCount ?? 0;
  const featuredSessionId = featured?.session_id ?? featured?.sessionId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#0d0705]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, rgba(232,120,73,0.3), transparent 50%), radial-gradient(circle at 75% 75%, rgba(184,80,40,0.2), transparent 50%)" }} />
        <div className="relative mx-auto max-w-[1400px] px-6 md:px-10 pt-20 md:pt-32 pb-20 md:pb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center text-background">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-60">
              {liveSessions.length > 0 ? <>· Live Now · {liveSessions[0].title}</> : "· Fine Art Auctions · Est. 2026"}
            </div>
            <h1 className="mt-8 font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight">
              Modern Masters,
              <br />
              <span className="italic font-light">Curated Editions</span>
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed opacity-80">
              Works from estates, ateliers, and private collections — presented with full
              provenance, condition, and care. Every sale is a timed session: bid until the
              clock runs out.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/auctions"
                className="bg-background text-foreground px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity"
              >
                View Catalogue
              </Link>
              <Link
                to="/live"
                className="text-[11px] font-medium uppercase tracking-[0.22em] opacity-70 hover:opacity-100 transition-opacity"
              >
                Live bidding slots →
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-8 max-w-md">
              <Stat n={isLoading || isError ? "—" : catalogueCount} label="Catalogue Lots" />
              <Stat n={isLoading || isError ? "—" : artistsCount} label="Artists" />
              <Stat n={isLoading || isError ? "—" : soldCount} label="Sold" />
            </div>
          </div>

          {/* Featured lot or placeholder */}
          {featured ? (
            <Link to="/lot/$id" params={{ id: featured.id }} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-white/5">
                <img
                  src={lotImage(featured)}
                  alt={`${featured.title} by ${featured.artist}`}
                  width={1024}
                  height={1280}
                  className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
                  onError={(e) => {
                    const image = e.currentTarget;
                    const fallback = `/lots/lot-${String(((featured.lot_number ?? featured.lotNumber ?? 1) - 1) % 9 + 1).padStart(2, "0")}.jpg`;
                    if (image.src !== new URL(fallback, window.location.href).href) image.src = fallback;
                  }}
                />
              </div>
              <div className="mt-6 flex items-end justify-between gap-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
                    Featured Lot · No. {lotNumber(featured)}
                  </div>
                  <h2 className="mt-3 font-serif text-2xl md:text-3xl leading-tight">
                    {featured.artist} <span className="opacity-50">—</span>{" "}
                    <span className="italic">{featured.title}</span>
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">Current</div>
                  <div className="mt-1.5 font-serif text-2xl">{formatBid(lotCurrentBid(featured))}</div>
                  <div className="mt-1 font-mono text-[11px] text-live">
                    {formatCountdown(sessionsById[featuredSessionId]?.ends_at ?? sessionsById[featuredSessionId]?.endsAt)}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden bg-white/5">
              <img
                src="/lots/lot-01.jpg"
                alt="Artwork from the Kalashetra collection"
                className="absolute inset-0 h-full w-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120904] via-[#120904]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 md:p-10 text-background">
              {isLoading ? (
                <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">Loading catalogue…</div>
              ) : (
                <>
                  <p className="font-serif text-2xl italic opacity-80">New collection incoming</p>
                  <p className="mt-3 text-[13px] opacity-75 max-w-xs">Our next curated auction session is being prepared. Check back soon or explore the catalogue.</p>
                  <Link to="/auctions" className="mt-6 text-[11px] uppercase tracking-[0.18em] underline underline-offset-4 opacity-70 hover:opacity-100">
                    Browse catalogue →
                  </Link>
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ABOUT STRIP */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Curated</div>
            <h3 className="font-serif text-2xl">Every work, vetted</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Full provenance, condition reports, and expert curation. We accept only works we would hang on our own walls.
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Transparent</div>
            <h3 className="font-serif text-2xl">Bid with confidence</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Timed sessions with real-time bidding. No hidden reserves, no whispered deals. Every lot is available to every registered collector.
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">South Asian Art</div>
            <h3 className="font-serif text-2xl">Rooted in tradition</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Specialising in modern and contemporary art from the Indian subcontinent — Progressive Artists' Group, Bengal School, and the emerging voices of today.
            </p>
          </div>
        </div>
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
                      src={lotImage(l)}
                      alt={`${l.title} by ${l.artist}`}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      onError={(e) => {
                        const image = e.currentTarget;
                        const fallback = `/lots/lot-${String(((l.lot_number ?? l.lotNumber ?? 1) - 1) % 9 + 1).padStart(2, "0")}.jpg`;
                        if (image.src !== new URL(fallback, window.location.href).href) image.src = fallback;
                      }}
                    />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-serif text-lg leading-snug">{l.artist}</div>
                      <div className="font-serif italic text-[13px] text-muted-foreground">{l.title}{l.year ? `, ${l.year}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-lg">{formatBid(lotCurrentBid(l))}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{lotBidCount(l)} bids</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24">
          <div className="text-center mb-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">How it works</div>
            <h2 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">Three simple steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step n="01" title="Create an account" desc="Sign in with Google. Your collector profile is created instantly — no forms, no waiting." />
            <Step n="02" title="Register for a session" desc="Browse upcoming auctions and register for the sessions you're interested in. Admin approval is quick." />
            <Step n="03" title="Place your bids" desc="When the session goes live, bid in real time. Highest bidder wins when the clock hits zero." />
          </div>
          <div className="text-center mt-12">
            <Link to="/auth" className="bg-foreground text-background px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity inline-block">
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER / CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">Stay informed</div>
          <h2 className="font-serif text-3xl md:text-4xl tracking-tight">New sessions drop regularly</h2>
          <p className="mt-4 text-[14px] text-muted-foreground max-w-lg mx-auto">
            We curate new auction sessions every few weeks. Follow us or check back to catch the next one before it goes live.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/dispatch" className="border border-foreground px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] hover:bg-foreground hover:text-background transition-colors">
              Read The Dispatch
            </Link>
            <Link to="/sell" className="border border-border px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
              Consign a work
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <div className="font-serif text-3xl">{n}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">{label}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{n}</div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
