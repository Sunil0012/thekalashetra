import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Sell with Vermillion" }] }),
  component: SellPage,
});

function SellPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", artist: "", title: "", year: "", medium: "", notes: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-12">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Consign</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Sell at Vermillion</h1>
        <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Our specialists review submissions on a rolling basis for the upcoming seasonal catalogue.
          Tell us about the work — we typically reply within five business days with an indicative
          estimate and consignment terms.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 border-t border-border pt-16">
        <div>
          <h2 className="font-serif text-3xl">How it works</h2>
          <ol className="mt-8 space-y-8">
            {[
              { n: "01", t: "Submit", d: "Share images, dimensions, and provenance details using the form." },
              { n: "02", t: "Specialist review", d: "Our team values the work and proposes a reserve and estimate range." },
              { n: "03", t: "Catalogue", d: "Approved lots are photographed and written up for the next sale." },
              { n: "04", t: "Settle", d: "Net proceeds are paid out within ten business days of the sale closing." },
            ].map((s) => (
              <li key={s.n} className="grid grid-cols-[auto_1fr] gap-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground pt-1">{s.n}</span>
                <div>
                  <div className="font-serif text-xl">{s.t}</div>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 border-t border-border pt-6 text-[12px] text-muted-foreground leading-relaxed">
            Seller's commission is 12% of the hammer price. No upfront fees.
          </div>
        </div>

        {submitted ? (
          <div className="border border-border p-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Received</div>
            <h3 className="mt-4 font-serif text-3xl">Thank you, {form.name.split(" ")[0] || "friend"}.</h3>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              A specialist will reach out at <span className="text-foreground">{form.email}</span> within five
              business days regarding <span className="italic">{form.title || "your submission"}</span>.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: "", email: "", artist: "", title: "", year: "", medium: "", notes: "" }); }}
              className="mt-8 border border-foreground px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors"
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="Artist" value={form.artist} onChange={(v) => setForm({ ...form, artist: v })} required />
            <Field label="Title of work" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <div className="grid grid-cols-2 gap-5">
              <Field label="Year" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
              <Field label="Medium" value={form.medium} onChange={(v) => setForm({ ...form, medium: v })} />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Notes & provenance
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={5}
                className="w-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:border-foreground"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-4 text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
            >
              Submit for review
            </button>
          </form>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:border-foreground"
      />
    </div>
  );
}
