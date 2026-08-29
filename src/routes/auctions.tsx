import { createFileRoute, Link, redirect, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { getCatalogue } from "@/lib/auction.functions";
import { formatBid, formatCountdown } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

type Search = { q?: string; cat?: string; sort?: string };

const SORTS = ["Ending Soon", "Price · High → Low", "Price · Low → High", "Lot Number"] as const;

export const Route = createFileRoute("/auctions")({
  beforeLoad: async () => {
    const { getCurrentSession } = await import("@/auth/functions");
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/auth", search: { redirect: "/auctions" } });
  },
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
  }),
  head: () => ({ meta: [{ title: "Current Auctions — Kalashetra" }, { name: "description", content: "Browse all lots open for bidding in Kalashetra's live auction sessions." }] }),
  component: AuctionsPage,
});

function AuctionsPage() {
  useNow(30_000);
  const search = useSearch({ from: "/auctions" });
  const fn = useServerFn(getCatalogue);
  const { data, isLoading, error } = useQuery({ queryKey: ["catalogue"], queryFn: () => fn() });

  const lots = data?.lots ?? [];
  const sessionsById: Record<string, any> = data?.sessionsById ?? {};

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const l of lots) if (l.category) set.add(l.category);
    return ["All Works", ...Array.from(set).sort()];
  }, [lots]);

  const cat = categories.includes(search.cat ?? "") ? (search.cat as string) : "All Works";
  const sort = (SORTS as readonly string[]).includes(search.sort ?? "") ? (search.sort as (typeof SORTS)[number]) : "Ending Soon";
  const query = (search.q ?? "").toLowerCase().trim();

  const visible = useMemo(() => {
    let list = cat === "All Works" ? lots : lots.filter((l: any) => l.category === cat);
    if (query) {
      list = list.filter(
        (l: any) =>
          l.artist?.toLowerCase().includes(query) ||
          l.title?.toLowerCase().includes(query) ||
          l.category?.toLowerCase().includes(query),
      );
    }
    const ends = (l: any) => new Date(sessionsById[l.session_id]?.ends_at ?? 0).getTime();
    const sorted = [...list];
    switch (sort) {
      case "Ending Soon": sorted.sort((a, b) => ends(a) - ends(b) || a.lot_number - b.lot_number); break;
      case "Price · High → Low": sorted.sort((a, b) => Number(b.current_bid) - Number(a.current_bid)); break;
      case "Price · Low → High": sorted.sort((a, b) => Number(a.current_bid) - Number(b.current_bid)); break;
      case "Lot Number": sorted.sort((a, b) => a.lot_number - b.lot_number); break;
    }
    return sorted;
  }, [lots, sessionsById, cat, sort, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 pb-12">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Catalogue</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Current Auctions</h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {visible.length} {visible.length === 1 ? "lot" : "lots"}
          {query ? <> matching <span className="text-foreground italic">"{search.q}"</span></> : " open for bidding"}.
          Bidding closes when each session's countdown ends.
        </p>
        {query && (
          <Link to="/auctions" search={{}} className="mt-4 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
            Clear search
          </Link>
        )}
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-1">
            {categories.map((c) => {
              const active = c === cat;
              return (
                <Link
                  key={c}
                  to="/auctions"
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
          <div className="flex items-center gap-1">
            {SORTS.map((s) => (
              <Link
                key={s}
                to="/auctions"
                search={(prev: Search) => ({ ...prev, sort: s === "Ending Soon" ? undefined : s })}
                className={
                  "px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors " +
                  (s === sort ? "text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground")
                }
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-14 pb-24">
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground text-[13px]">Loading catalogue…</div>
        ) : error ? (
          <div className="py-24 text-center border border-border">
            <p className="font-serif text-2xl italic">Something went wrong loading the catalogue.</p>
            <p className="mt-4 text-[13px] text-muted-foreground">{(error as any)?.message ?? "Unknown error"}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center border border-border">
            <p className="font-serif text-2xl italic">No lots yet.</p>
            <p className="mt-3 text-[13px] text-muted-foreground">Add lots from the admin panel to see them here.</p>
            <Link to="/admin/sessions" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
              Go to admin →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {visible.map((l: any) => {
              const session = sessionsById[l.session_id];
              return (
                <Link key={l.id} to="/lot/$id" params={{ id: l.id }} className="group block">
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    <img
                      src={l.image_url ?? ""}
                      alt={`${l.title} by ${l.artist}`}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    {l.status === "sold" && (
                      <div className="absolute top-3 left-3 bg-foreground text-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">Sold</div>
                    )}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lot {l.lot_number} · {l.category ?? "—"}</div>
                      <div className="mt-2 font-serif text-lg leading-snug">{l.artist}</div>
                      <div className="font-serif italic text-[13px] text-muted-foreground">{l.title}{l.year ? `, ${l.year}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-lg">{formatBid(l.current_bid)}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{l.bid_count} bids</div>
                      <div className="mt-1 font-mono text-[10px] text-live">{formatCountdown(session?.ends_at)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
