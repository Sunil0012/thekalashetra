import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { listDispatches } from "@/lib/ai.functions";
import img1 from "@/assets/dispatch-1.jpg";
import img2 from "@/assets/dispatch-2.jpg";
import img3 from "@/assets/dispatch-3.jpg";
import img4 from "@/assets/dispatch-4.jpg";

const IMAGES = [img1, img2, img3, img4];

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "The Dispatch — Art World Writing | Kalashetra" },
      { name: "description", content: "Kalashetra's editorial desk: market analysis, artist primers, conservation notes and collecting guides from the world of fine art." },
      { property: "og:title", content: "The Dispatch — Kalashetra" },
      { property: "og:description", content: "Market analysis, artist primers and collecting guides from Kalashetra's editorial desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  const fn = useServerFn(listDispatches);
  const { data, isLoading } = useQuery({ queryKey: ["dispatch"], queryFn: () => fn(), staleTime: 30 * 60 * 1000 });
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const items = data?.items ?? [];
  const lead = items[0];
  const rest = items.slice(1);
  const open = items.find((i: any) => i.slug === openSlug) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 pb-10 border-b border-border">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">· Editorial Desk</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">The <span className="italic font-light">Dispatch</span></h1>
        <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Writing from the art world — market mechanics, artist primers, provenance and conservation, and the
          South Asian modern scene. Composed by our AI editorial desk and refreshed through the day.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-16">
        {isLoading ? (
          <div className="py-24 text-center text-[13px] text-muted-foreground">Setting today's edition…</div>
        ) : data?.error ? (
          <div className="py-24 text-center border-y border-border">
            <p className="font-serif text-2xl italic">The desk is quiet right now.</p>
            <p className="mt-3 text-[13px] text-muted-foreground">{data.error}</p>
          </div>
        ) : (
          <>
            {lead && (
              <button onClick={() => setOpenSlug(lead.slug)} className="group grid lg:grid-cols-2 gap-10 lg:gap-16 text-left w-full pb-16 border-b border-border">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={IMAGES[lead.imageIndex] ?? img1} alt={lead.title} width={1024} height={768} className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]" />
                </div>
                <div className="self-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{lead.kicker} · {lead.readMinutes} min read</div>
                  <h2 className="mt-5 font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight">{lead.title}</h2>
                  <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{lead.standfirst}</p>
                  <span className="mt-8 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">Read the piece →</span>
                </div>
              </button>
            )}

            <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((a: any) => (
                <button key={a.slug} onClick={() => setOpenSlug(a.slug)} className="group text-left">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={IMAGES[a.imageIndex] ?? img2} alt={a.title} loading="lazy" width={1024} height={768} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{a.kicker} · {a.readMinutes} min</div>
                  <h3 className="mt-3 font-serif text-2xl leading-snug">{a.title}</h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{a.standfirst}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4 md:p-10" onClick={() => setOpenSlug(null)}>
          <article onClick={(e) => e.stopPropagation()} className="bg-background border border-border max-w-3xl w-full">
            <div className="aspect-[16/7] overflow-hidden bg-muted">
              <img src={IMAGES[open.imageIndex] ?? img1} alt={open.title} width={1024} height={768} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 md:p-12">
              <div className="flex items-start justify-between gap-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{open.kicker} · {open.readMinutes} min read{open.dateline ? ` · ${open.dateline}` : ""}</div>
                <button onClick={() => setOpenSlug(null)} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">Close ✕</button>
              </div>
              <h2 className="mt-5 font-serif text-3xl md:text-5xl leading-[1.05] tracking-tight">{open.title}</h2>
              <p className="mt-6 font-serif italic text-xl leading-relaxed text-muted-foreground">{open.standfirst}</p>
              <div className="mt-8 space-y-6 text-[15px] leading-[1.8]">
                {open.body.map((p: string, i: number) => <p key={i}>{p}</p>)}
              </div>
              {open.sources?.length > 0 && (
                <div className="mt-12 border-t border-border pt-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Reported with reference to</div>
                  <ul className="mt-4 space-y-2">
                    {open.sources.map((s: any, i: number) => (
                      <li key={i} className="text-[13px] leading-relaxed">
                        <span className="font-medium">{s.publication}</span>
                        {s.note ? <span className="text-muted-foreground"> — {s.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </article>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
