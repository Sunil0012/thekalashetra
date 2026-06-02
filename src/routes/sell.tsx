import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell at Vermillion — Consignment" },
      { name: "description", content: "Consign paintings, sculpture, photography, and works on paper for the next seasonal sale. Free valuations within five business days." },
    ],
  }),
  component: SellPage,
});

type Form = {
  // Step 1
  artist: string; title: string; year: string; medium: string;
  height: string; width: string; depth: string;
  signed: "yes" | "no" | "unknown";
  edition: string;
  // Step 2
  condition: "excellent" | "very-good" | "good" | "fair";
  provenance: string; exhibitionHistory: string; literature: string;
  estimate: string;
  // Step 3
  images: { name: string; size: number }[];
  // Step 4
  name: string; email: string; phone: string; country: string;
  reserveOk: boolean; termsOk: boolean;
};

const EMPTY: Form = {
  artist: "", title: "", year: "", medium: "",
  height: "", width: "", depth: "",
  signed: "unknown", edition: "",
  condition: "very-good",
  provenance: "", exhibitionHistory: "", literature: "",
  estimate: "",
  images: [],
  name: "", email: "", phone: "", country: "",
  reserveOk: false, termsOk: false,
};

const STEPS = [
  { n: "01", t: "The Work" },
  { n: "02", t: "Provenance" },
  { n: "03", t: "Images" },
  { n: "04", t: "Your Details" },
] as const;

function SellPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.artist && form.title && form.year && form.medium;
    if (step === 1) return form.condition && form.estimate;
    if (step === 2) return form.images.length > 0;
    if (step === 3) return form.name && form.email && form.country && form.termsOk;
    return true;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNext()) return;
    if (step < 3) { setStep(step + 1); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <section className="mx-auto max-w-3xl px-6 md:px-10 py-32 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Submission Received · Ref #VMS-{Math.floor(100000 + Math.random() * 900000)}
          </div>
          <h1 className="mt-8 font-serif text-5xl md:text-7xl tracking-tight">
            Thank you, <span className="italic">{form.name.split(" ")[0] || "friend"}.</span>
          </h1>
          <p className="mt-8 text-[15px] leading-relaxed text-muted-foreground">
            A senior specialist will review <span className="italic text-foreground">{form.title}</span> by{" "}
            <span className="text-foreground">{form.artist}</span> and reach out at{" "}
            <span className="text-foreground">{form.email}</span> within five business days with an
            indicative estimate and consignment terms.
          </p>
          <button
            onClick={() => { setForm(EMPTY); setStep(0); setSubmitted(false); }}
            className="mt-12 border border-foreground px-7 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:bg-foreground hover:text-background transition-colors"
          >
            Submit another work
          </button>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              · Consign · Spring 2026
            </div>
            <h1 className="mt-8 font-serif text-5xl md:text-7xl tracking-tight leading-[0.95]">
              Sell a work at <span className="italic">Vermillion.</span>
            </h1>
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground max-w-md">
            Our specialists accept submissions on a rolling basis for the next seasonal catalogue.
            Most consignors hear back within five business days with an estimate, reserve, and net
            terms. Seller's commission is a flat 12% — no upfront fees.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
          {[
            { n: "01", t: "Submit", d: "Tell us about the work — artist, dimensions, images, and provenance." },
            { n: "02", t: "Specialist Review", d: "We value the work and propose a reserve and estimate range." },
            { n: "03", t: "Catalogue", d: "Approved lots are photographed and written up for the next sale." },
            { n: "04", t: "Settle", d: "Net proceeds are paid out within ten business days of the sale closing." },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.n}</div>
              <div className="mt-4 font-serif text-2xl">{s.t}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16">
        {/* Stepper */}
        <aside>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
            Consignment Form
          </div>
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <li key={s.n}>
                  <button
                    type="button"
                    onClick={() => (done ? setStep(i) : null)}
                    disabled={!done && !active}
                    className={
                      "w-full text-left flex items-center gap-4 py-3 border-l-2 pl-4 transition-colors " +
                      (active
                        ? "border-foreground"
                        : done
                          ? "border-foreground/40 hover:border-foreground"
                          : "border-border")
                    }
                  >
                    <span className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground w-8">{s.n}</span>
                    <span className={"font-serif text-lg " + (active ? "" : done ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      {s.t}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-12 border-t border-border pt-6 space-y-3 text-[12px] text-muted-foreground leading-relaxed">
            <div><span className="font-mono text-foreground">12%</span> seller's commission, flat.</div>
            <div>No upfront listing fees.</div>
            <div>Insured shipping arranged by Vermillion.</div>
          </div>
        </aside>

        {/* Step content */}
        <form onSubmit={onSubmit} className="max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Step {step + 1} of 4
          </div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl tracking-tight">
            {step === 0 && <>About <span className="italic">the work.</span></>}
            {step === 1 && <>Condition & <span className="italic">provenance.</span></>}
            {step === 2 && <>Images of <span className="italic">the work.</span></>}
            {step === 3 && <>Your <span className="italic">details.</span></>}
          </h2>

          <div className="mt-10 space-y-6">
            {step === 0 && (
              <>
                <Field label="Artist" value={form.artist} onChange={(v) => update("artist", v)} required placeholder="e.g. Helene Marchetti" />
                <Field label="Title of work" value={form.title} onChange={(v) => update("title", v)} required />
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Year created" value={form.year} onChange={(v) => update("year", v)} required placeholder="2024" />
                  <Field label="Medium" value={form.medium} onChange={(v) => update("medium", v)} required placeholder="Oil on linen" />
                </div>
                <div>
                  <Label>Dimensions (cm)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Box value={form.height} onChange={(v) => update("height", v)} ph="Height" />
                    <Box value={form.width} onChange={(v) => update("width", v)} ph="Width" />
                    <Box value={form.depth} onChange={(v) => update("depth", v)} ph="Depth (opt.)" />
                  </div>
                </div>
                <div>
                  <Label>Signed by the artist?</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(["yes", "no", "unknown"] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => update("signed", opt)}
                        className={
                          "py-3 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors " +
                          (form.signed === opt
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground")
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Edition (if applicable)" value={form.edition} onChange={(v) => update("edition", v)} placeholder="e.g. 3 of 12" />
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label>Condition</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {(["excellent", "very-good", "good", "fair"] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => update("condition", opt)}
                        className={
                          "py-3 text-[11px] font-medium uppercase tracking-[0.18em] border transition-colors capitalize " +
                          (form.condition === opt
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground")
                        }
                      >
                        {opt.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <TextArea label="Provenance" value={form.provenance} onChange={(v) => update("provenance", v)} placeholder="Where and when was the work acquired? Previous owners, gallery records, certificates…" />
                <TextArea label="Exhibition history (optional)" value={form.exhibitionHistory} onChange={(v) => update("exhibitionHistory", v)} />
                <TextArea label="Literature & catalogue references (optional)" value={form.literature} onChange={(v) => update("literature", v)} />
                <Field label="Your estimated value (USD)" value={form.estimate} onChange={(v) => update("estimate", v)} required placeholder="e.g. 6,000 – 9,000" />
              </>
            )}

            {step === 2 && (
              <>
                <Label>Upload images (front, back, signature, condition details)</Label>
                <label className="block border-2 border-dashed border-border hover:border-foreground transition-colors p-12 text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
                      update("images", [...form.images, ...files]);
                    }}
                    className="hidden"
                  />
                  <div className="font-serif text-2xl italic">Drag images here</div>
                  <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                    or click to browse
                  </div>
                  <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    JPG / PNG · up to 20MB each
                  </div>
                </label>

                {form.images.length > 0 && (
                  <ul className="mt-4 divide-y divide-border border border-border">
                    {form.images.map((f, i) => (
                      <li key={i} className="flex items-center justify-between px-4 py-3 text-[13px]">
                        <span className="font-mono text-[12px] truncate">{f.name}</span>
                        <span className="flex items-center gap-4">
                          <span className="text-muted-foreground font-mono text-[11px]">{(f.size / 1024).toFixed(0)} KB</span>
                          <button
                            type="button"
                            onClick={() => update("images", form.images.filter((_, j) => j !== i))}
                            className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-live"
                          >
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Your full name" value={form.name} onChange={(v) => update("name", v)} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
                  <Field label="Phone (optional)" value={form.phone} onChange={(v) => update("phone", v)} />
                </div>
                <Field label="Country of residence" value={form.country} onChange={(v) => update("country", v)} required />

                <div className="space-y-3 pt-4">
                  <Check checked={form.reserveOk} onChange={(v) => update("reserveOk", v)}>
                    I'm open to setting a reserve below my estimated value if recommended by the specialist.
                  </Check>
                  <Check checked={form.termsOk} onChange={(v) => update("termsOk", v)} required>
                    I agree to Vermillion's consignment terms and confirm I am the legal owner of this work.
                  </Check>
                </div>
              </>
            )}
          </div>

          {/* Nav */}
          <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={!canNext()}
              className="bg-foreground text-background px-8 py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {step < 3 ? "Continue →" : "Submit for Review"}
            </button>
          </div>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{children}</label>;
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border-b border-border bg-transparent px-0 py-3 text-[16px] font-serif focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
  );
}

function Box({ value, onChange, ph }: { value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ph}
      className="w-full border border-border bg-background px-4 py-3 text-[14px] font-serif focus:outline-none focus:border-foreground"
    />
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full border border-border bg-background px-4 py-3 text-[14px] leading-relaxed focus:outline-none focus:border-foreground"
      />
    </div>
  );
}

function Check({ checked, onChange, required, children }: { checked: boolean; onChange: (v: boolean) => void; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span
        className={
          "mt-0.5 h-4 w-4 border flex items-center justify-center shrink-0 transition-colors " +
          (checked ? "bg-foreground border-foreground" : "border-border group-hover:border-foreground")
        }
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-background"><path d="M20 6L9 17l-5-5"/></svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required={required} className="sr-only" />
      <span className="text-[13px] leading-relaxed text-muted-foreground">{children}</span>
    </label>
  );
}
