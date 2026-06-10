import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { getLot, recordPurchase } from "@/lib/auction.functions";
import { formatBid } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

type Search = { lot?: string };

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    lot: typeof s.lot === "string" ? s.lot : undefined,
  }),
  head: () => ({ meta: [{ title: "Secure Checkout — Kalashetra" }] }),
  component: CheckoutPage,
});

type PayMethod = "card" | "upi" | "netbanking" | "wallet";

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Yes Bank", "Punjab National Bank", "Citi Bank"];
const WALLETS = ["Paytm", "PhonePe", "Amazon Pay", "Mobikwik"];

function CheckoutPage() {
  const navigate = useNavigate();
  const { lot: lotId } = useSearch({ from: "/checkout" });
  const { user, loading: authLoading } = useAuth();

  const fetchLot = useServerFn(getLot);
  const purchase = useServerFn(recordPurchase);
  const { data, isLoading } = useQuery({
    queryKey: ["lot", lotId],
    queryFn: () => fetchLot({ data: { id: lotId! } }),
    enabled: !!lotId,
    retry: false,
  });

  const [method, setMethod] = useState<PayMethod>("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const lot = (data as any)?.lot;
  const totals = useMemo(() => {
    const hammer = Number(lot?.current_bid ?? 0);
    const premium = Math.round(hammer * 0.22);
    const shipping = 75;
    const tax = Math.round((hammer + premium) * 0.05);
    return { hammer, premium, shipping, tax, total: hammer + premium + shipping + tax };
  }, [lot?.current_bid]);

  if (!lotId || (!isLoading && !lot)) {
    return (
      <Shell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="font-serif text-4xl">No lot selected</h1>
          <p className="mt-4 text-muted-foreground">Choose a lot you've won to complete checkout.</p>
          <Link to="/account" className="mt-8 inline-block bg-foreground text-background px-8 py-4 text-[11px] uppercase tracking-[0.22em]">Go to account</Link>
        </section>
      </Shell>
    );
  }

  if (!authLoading && !user) {
    return (
      <Shell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="font-serif text-4xl">Sign in to complete checkout</h1>
          <p className="mt-4 text-muted-foreground">You need to be signed in to confirm payment for this lot.</p>
          <Link
            to="/auth"
            search={{ redirect: `/checkout?lot=${lotId}` } as never}
            className="mt-8 inline-block bg-foreground text-background px-8 py-4 text-[11px] uppercase tracking-[0.22em]"
          >
            Sign in to continue
          </Link>
        </section>
      </Shell>
    );
  }

  if (isLoading || authLoading) {
    return (
      <Shell>
        <div className="py-40 text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Loading checkout…</div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Payment Confirmed</div>
          <h1 className="mt-6 font-serif text-5xl">Congratulations.</h1>
          <p className="mt-6 text-[15px] text-muted-foreground leading-relaxed">
            <span className="italic font-serif">{lot.title}</span> by {lot.artist} is yours.
            Reference <span className="font-mono">{done}</span>. A receipt and shipping details
            will follow by email.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link to="/account" className="bg-foreground text-background px-7 py-4 text-[11px] uppercase tracking-[0.22em]">View in account</Link>
            <Link to="/auctions" className="border border-border px-7 py-4 text-[11px] uppercase tracking-[0.22em]">Keep browsing</Link>
          </div>
        </section>
      </Shell>
    );
  }

  if (lot.status === "sold") {
    return (
      <Shell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="font-serif text-4xl">This lot is already settled.</h1>
          <Link to="/account" className="mt-8 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">View your account</Link>
        </section>
      </Shell>
    );
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "card") {
      const digits = card.number.replace(/\s/g, "");
      if (digits.length < 12) return toast.error("Enter a valid card number.");
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return toast.error("Expiry must be MM/YY.");
      if (card.cvv.length < 3) return toast.error("Enter a valid CVV.");
      if (!card.name.trim()) return toast.error("Enter the cardholder name.");
    } else if (method === "upi") {
      if (!/^[\w.\-]+@[\w.\-]+$/.test(upi)) return toast.error("Enter a valid UPI ID (e.g. name@bank).");
    }
    setProcessing(true);
    try {
      const ref = `KAL-${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      await purchase({ data: { lotId: lot.id, hammer: totals.hammer, paymentRef: ref } });
      setDone(ref);
    } catch (err: any) {
      toast.error(err?.message ?? "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Shell>
      <section className="mx-auto max-w-[1100px] px-6 md:px-10 pt-16 pb-24">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Secure Checkout</div>
        <h1 className="mt-4 font-serif text-5xl">Complete your purchase</h1>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px] items-start">
          {/* PAYMENT */}
          <form onSubmit={handlePay} className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                ["card", "Card"],
                ["upi", "UPI"],
                ["netbanking", "Netbanking"],
                ["wallet", "Wallet"],
              ] as [PayMethod, string][]).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    "border py-4 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors " +
                    (method === m ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {method === "card" && (
              <div className="space-y-5">
                <Field label="Card number" value={card.number} onChange={(v) => setCard({ ...card, number: v })} placeholder="4242 4242 4242 4242" />
                <Field label="Cardholder name" value={card.name} onChange={(v) => setCard({ ...card, name: v })} placeholder="Name on card" />
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Expiry (MM/YY)" value={card.expiry} onChange={(v) => setCard({ ...card, expiry: v })} placeholder="09/29" />
                  <Field label="CVV" value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v })} placeholder="•••" type="password" />
                </div>
              </div>
            )}
            {method === "upi" && (
              <Field label="UPI ID" value={upi} onChange={setUpi} placeholder="name@bank" />
            )}
            {method === "netbanking" && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Select bank</label>
                <select value={bank} onChange={(e) => setBank(e.target.value)} className="w-full bg-transparent border-b border-border py-3 focus:outline-none">
                  {BANKS.map((b) => <option key={b} value={b} className="bg-background">{b}</option>)}
                </select>
              </div>
            )}
            {method === "wallet" && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Select wallet</label>
                <select value={wallet} onChange={(e) => setWallet(e.target.value)} className="w-full bg-transparent border-b border-border py-3 focus:outline-none">
                  {WALLETS.map((w) => <option key={w} value={w} className="bg-background">{w}</option>)}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-foreground text-background py-5 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 disabled:opacity-50"
            >
              {processing ? "Processing payment…" : `Pay ${formatBid(totals.total)}`}
            </button>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Payments are encrypted. The hammer price plus 22% buyer's premium, shipping and tax
              are charged now; Kalashetra's commission is settled separately with the consignor.
            </p>
          </form>

          {/* SUMMARY */}
          <aside className="border border-border p-7">
            <div className="flex gap-5">
              <div className="w-24 h-24 bg-muted overflow-hidden shrink-0">
                <img src={lot.image_url ?? ""} alt={lot.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lot {lot.lot_number}</div>
                <div className="mt-1 font-serif text-lg leading-snug">{lot.artist}</div>
                <div className="font-serif italic text-[13px] text-muted-foreground">{lot.title}</div>
              </div>
            </div>
            <dl className="mt-7 space-y-3 text-[13px] border-t border-border pt-6">
              <Row k="Hammer price" v={formatBid(totals.hammer)} />
              <Row k="Buyer's premium (22%)" v={formatBid(totals.premium)} />
              <Row k="Shipping & handling" v={formatBid(totals.shipping)} />
              <Row k="Tax (5%)" v={formatBid(totals.tax)} />
              <div className="border-t border-border pt-3">
                <Row k="Total due" v={formatBid(totals.total)} bold />
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "font-serif text-xl" : "")}>
      <dt className={bold ? "" : "text-muted-foreground"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b border-border bg-transparent px-0 py-3 text-[15px] focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
  );
}
