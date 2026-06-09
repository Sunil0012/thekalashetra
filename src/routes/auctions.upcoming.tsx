import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { listSessions } from "@/lib/auction.functions";
import { formatCountdown } from "@/lib/format";

export const Route = createFileRoute("/auctions/upcoming")({
  head: () => ({ meta: [{ title: "Upcoming Auctions — Kalashetra" }, { name: "description", content: "Forthcoming auction sessions at Kalashetra. Preview catalogues and set reminders before bidding opens." }] }),
  component: UpcomingPage,
});

function UpcomingPage() {
  const fn = useServerFn(listSessions);
  const { data, isLoading } = useQuery({ queryKey: ["sessions", "upcoming"], queryFn: () => fn({ data: { status: "upcoming" } }) });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 pb-12">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Calendar</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Upcoming Auctions</h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Forthcoming sessions. Catalogues open for preview before bidding begins.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24">
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground text-[13px]">Loading…</div>
        ) : (data ?? []).length === 0 ? (
          <div className="py-24 text-center border-y border-border">
            <p className="font-serif text-2xl italic">No upcoming sessions announced yet.</p>
            <Link to="/auctions" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">View current auctions</Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {(data ?? []).map((s: any) => (
              <article key={s.id} className="border border-border group">
                {s.cover_image && (
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img src={s.cover_image} alt={s.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="p-8">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Opens in {formatCountdown(s.starts_at)}</div>
                  <h2 className="mt-3 font-serif text-3xl">{s.title}</h2>
                  <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed line-clamp-3">{s.description}</p>
                  <div className="mt-6 font-mono text-[11px] text-muted-foreground">
                    {new Date(s.starts_at).toLocaleDateString(undefined, { dateStyle: "long" })} → {new Date(s.ends_at).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
