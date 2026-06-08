import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { LOTS, getLotLive, formatBid } from "@/lib/auction-data";

export const Route = createFileRoute("/artists")({
  head: () => ({ meta: [{ title: "Artists — Kalashetra" }] }),
  component: ArtistsPage,
});

function ArtistsPage() {
  const artists = Array.from(
    new Map(LOTS.map((l) => [l.artist, l])).values(),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Roster · Spring 2026</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Artists on Sale</h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Nine artists are represented in this season's catalogue, from emerging draftspeople to mid-career painters
          and sculptors with international exhibition histories.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-20 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {artists.map((a, i) => {
            const lots = LOTS.filter((l) => l.artist === a.artist);
            return (
              <div key={a.artist} className={"py-10 md:px-8 " + (i % 3 !== 0 ? "" : "")}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {a.category}
                </div>
                <h2 className="mt-3 font-serif text-3xl">{a.artist}</h2>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{a.artistBio}</p>
                <div className="mt-6 space-y-3">
                  {lots.map((l) => {
                    const live = getLotLive(l.id);
                    return (
                      <Link
                        key={l.id}
                        to="/lot/$id"
                        params={{ id: l.id }}
                        className="flex items-center gap-4 group"
                      >
                        <div className="w-14 h-14 bg-muted overflow-hidden flex-none">
                          <img src={l.image} alt={l.title} loading="lazy" width={1024} height={1024} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif italic text-[14px] truncate group-hover:text-foreground">{l.title}, {l.year}</div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lot · {l.id}</div>
                        </div>
                        <div className="font-serif text-[14px]">{formatBid(live.bid)}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
