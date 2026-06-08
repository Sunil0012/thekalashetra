import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Kalashetra" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">About</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6 max-w-3xl">
          A small house, attentive to the work.
        </h1>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16 border-t border-border pt-16">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Founded 2026 · Based in Lisbon
        </div>
        <div className="space-y-6 text-[15px] leading-relaxed">
          <p>
            Kalashetra is an online auction house dedicated to contemporary works on paper, painting,
            print, photography, and small-scale sculpture. We work directly with artists, estates, and
            private collectors to bring carefully chosen lots to a serious audience of new collectors.
          </p>
          <p>
            Each season is presented as a single catalogue. Lots are open for bidding for one to two
            weeks. Our system places proxy bids on your behalf in standard increments, up to the
            maximum you choose, so you never need to refresh and react.
          </p>
          <p>
            We believe in fair fees, clean condition reports, and a quiet visual register that lets the
            work do the talking.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border pt-16">
        {[
          { label: "Seller's commission", value: "12%" },
          { label: "Buyer's premium", value: "22%" },
          { label: "Reply within", value: "5 days" },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-serif text-6xl">{s.value}</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 border-t border-border pt-16">
        <h2 className="font-serif text-3xl">Specialists</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { name: "Mara Lindqvist", role: "Head of Sale", focus: "Painting & works on paper" },
            { name: "Jonas Vrest", role: "Specialist", focus: "Photography & print" },
            { name: "Aïcha Bensaïd", role: "Specialist", focus: "Sculpture & ceramics" },
          ].map((p) => (
            <div key={p.name}>
              <div className="font-serif text-2xl">{p.name}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{p.role}</div>
              <div className="mt-2 text-[14px] text-muted-foreground">{p.focus}</div>
              <a href="mailto:hello@vermillion.art" className="mt-3 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
                Get in touch
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 border-t border-border pt-16 flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-serif text-4xl max-w-xl">Bidding opens daily. Have a look at the current sale.</h2>
        <Link to="/" className="bg-foreground text-background px-8 py-4 text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-90 transition-opacity">
          View Auctions
        </Link>
      </section>
      <SiteFooter />
    </div>
  );
}
