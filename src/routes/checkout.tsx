import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { LOTS, formatBid, getLotLive, getUser } from "@/lib/auction-data";

type Search = { lot?: string };

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    lot: typeof s.lot === "string" ? s.lot : undefined,
  }),
  head: () => ({ meta: [{ title: "Secure Checkout — Vermillion" }] }),
  component: CheckoutPage,
});

type PayMethod = "card" | "upi" | "netbanking" | "wallet";

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Yes Bank", "Punjab National Bank", "Citi Bank"];
const WALLETS = ["Paytm", "PhonePe", "Amazon Pay", "Mobikwik"];

function CheckoutPage() {
  const navigate = useNavigate();
  const { lot: lotId } = useSearch({ from: "/checkout" });
  const lot = LOTS.find((l) => l.id === lotId) ?? LOTS[0];
  const live = getLotLive(lot.id);
  const user = getUser();

  const [method, setMethod] = useState<PayMethod>("card");
  const [card, setCard] = useState({ number: "", name: user?.name ?? "", expiry: "", cvv: "" });
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const hammer = live.bid;
    const premium = Math.round(hammer * 0.22);
    const shipping = 75;
    const tax = Math.round((hammer + premium) * 0.05);
    const total = hammer + premium + shipping + tax;
    return { hammer, premium, shipping, tax, total };
  }, [live.bid]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="font-serif text-4xl">Sign in to complete checkout</h1>
          <p className="mt-4 text-muted-foreground">You need to be signed in to confirm payment for this lot.</p>
          <Link
            to="/signin"
            search={{ redirect: `/checkout?lot=${lot.id}` } as never}
            className="mt-8 inline-block bg-foreground text-background px-8 py-4 text-[11px] uppercase tracking-[0.22em]"
          >
            Sign in to continue
          </Link>
        </section>
        <SiteFooter />
      </div>
    );
  }

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (method === "card") {
      const digits = card.number.replace(/\s/g, "");
      if (digits.length < 12) return setError("Enter a valid card number.");
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError("Expiry must be MM/YY.");
      if (card.cvv.length < 3) return setError("Enter a valid CVV.");
      if (!card.name.trim()) return setError("Enter the cardholder name.");
    } else if (method === "upi") {
      if (!/^[\w.\-]+@[\w.\-]+$/.test(upi)) return setError("Enter a valid UPI ID (e.g. name@bank).");
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone("VML-" + Math.random().toString(36).slice(2, 8).toUpperCase());
    }, 1400);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Payment Successful · Receipt #{done}
          </div>
          <h1 className="mt-6 font-serif text-5xl tracking-tight">
            Congratulations, <span className="italic">{user.name.split(" ")[0]}.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
            Your payment of <span className="text-foreground">{formatBid(totals.total)}</span> for{" "}
            <span className="italic text-foreground">{lot.title}</span> by{" "}
            <span className="text-foreground">{lot.artist}</span> has been confirmed.
            A specialist will reach out within 24 hours to arrange insured shipping.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/account" className="bg-foreground text-background px-7 py-4 text-[11px] uppercase tracking-[0.22em]">
              View account
            </Link>
            <button
              onClick={() => navigate({ to: "/auctions" })}
              className="border border-foreground px-7 py-4 text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background transition-colors"
            >
              Continue browsing
            </button>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 pb-8">
        <Link to="/lot/$id" params={{ id: lot.id }} className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
          ← Back to lot
        </Link>
        <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          · Secure Checkout
        </div>
        <h1 className="mt-6 font-serif text-5xl md:text-6xl tracking-tight">
          Confirm <span className="italic">payment.</span>
        </h1>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-16">
        {/* PAYMENT */}
        <form onSubmit={handlePay}>
          {/* Method selector */}
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
            Payment Method
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MethodBtn active={method === "card"} onClick={() => setMethod("card")} icon={CardIcon} label="Card" sub="Visa · MC · Amex" />
            <MethodBtn active={method === "upi"} onClick={() => setMethod("upi")} icon={UpiIcon} label="UPI" sub="GPay · PhonePe" />
            <MethodBtn active={method === "netbanking"} onClick={() => setMethod("netbanking")} icon={BankIcon} label="Netbanking" sub="50+ banks" />
            <MethodBtn active={method === "wallet"} onClick={() => setMethod("wallet")} icon={WalletIcon} label="Wallet" sub="Paytm · PhonePe" />
          </div>

          {/* Form per method */}
          <div className="mt-10 border-t border-border pt-10 space-y-6">
            {method === "card" && (
              <>
                <div>
                  <Label>Card number</Label>
                  <div className="relative">
                    <input
                      value={card.number}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                        const grouped = v.match(/.{1,4}/g)?.join(" ") ?? "";
                        setCard({ ...card, number: grouped });
                      }}
                      placeholder="1234 5678 9012 3456"
                      inputMode="numeric"
                      className="w-full border border-border bg-background px-4 py-4 text-[16px] font-mono tracking-wider focus:outline-none focus:border-foreground"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                      <BrandPill>VISA</BrandPill>
                      <BrandPill>MC</BrandPill>
                      <BrandPill>AMEX</BrandPill>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label>Expiry (MM/YY)</Label>
                    <input
                      value={card.expiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                        setCard({ ...card, expiry: v });
                      }}
                      placeholder="MM/YY"
                      className="w-full border border-border bg-background px-4 py-4 text-[16px] font-mono focus:outline-none focus:border-foreground"
                    />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <input
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="•••"
                      type="password"
                      className="w-full border border-border bg-background px-4 py-4 text-[16px] font-mono focus:outline-none focus:border-foreground"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cardholder name</Label>
                  <input
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    placeholder="Name on card"
                    className="w-full border border-border bg-background px-4 py-4 text-[16px] font-serif focus:outline-none focus:border-foreground"
                  />
                </div>
              </>
            )}

            {method === "upi" && (
              <>
                <div>
                  <Label>UPI ID</Label>
                  <input
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="yourname@hdfcbank"
                    className="w-full border border-border bg-background px-4 py-4 text-[16px] font-mono focus:outline-none focus:border-foreground"
                  />
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    You'll receive a payment request on your UPI app to authorise the transfer.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {["GPay", "PhonePe", "Paytm", "BHIM", "CRED"].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUpi("yourname@" + u.toLowerCase())}
                      className="border border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] hover:border-foreground transition-colors"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </>
            )}

            {method === "netbanking" && (
              <>
                <div>
                  <Label>Select your bank</Label>
                  <div className="relative">
                    <select
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full appearance-none border border-border bg-background px-4 py-4 pr-10 text-[15px] font-serif focus:outline-none focus:border-foreground"
                    >
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    You'll be redirected to your bank's secure login to complete payment.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BANKS.slice(0, 4).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBank(b)}
                      className={
                        "border px-3 py-3 text-[11px] uppercase tracking-[0.14em] transition-colors " +
                        (bank === b ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")
                      }
                    >
                      {b.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {method === "wallet" && (
              <div>
                <Label>Select wallet</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WALLETS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWallet(w)}
                      className={
                        "border px-4 py-4 text-[12px] uppercase tracking-[0.18em] transition-colors " +
                        (wallet === w ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")
                      }
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-[12px] text-live border-l-2 border-live pl-3 py-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-foreground text-background py-5 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {processing ? "Processing…" : `Pay ${formatBid(totals.total)} securely`}
            </button>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>256-bit TLS · PCI DSS certified · No card data stored</span>
            </div>
          </div>
        </form>

        {/* SUMMARY */}
        <aside className="lg:border-l lg:border-border lg:pl-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
            Order Summary
          </div>

          <div className="border border-border p-6">
            <div className="flex gap-5">
              <div className="w-24 h-24 shrink-0 bg-muted overflow-hidden">
                <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Lot · {lot.id}
                </div>
                <h3 className="mt-1 font-serif text-xl leading-tight">{lot.artist}</h3>
                <p className="font-serif italic text-[13px] text-muted-foreground">{lot.title}, {lot.year}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 text-[13px]">
              <Row label="Hammer price" value={formatBid(totals.hammer)} />
              <Row label="Buyer's premium (22%)" value={formatBid(totals.premium)} />
              <Row label="Insured shipping" value={formatBid(totals.shipping)} />
              <Row label="Tax (5%)" value={formatBid(totals.tax)} />
            </dl>

            <div className="mt-6 border-t border-border pt-5 flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Total</span>
              <span className="font-serif text-3xl">{formatBid(totals.total)}</span>
            </div>
          </div>

          <div className="mt-6 text-[12px] text-muted-foreground leading-relaxed">
            Payments are processed by a PCI-certified gateway. Vermillion never sees or stores your
            card or bank credentials.
          </div>
        </aside>
      </section>

      <SiteFooter />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{children}</label>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-serif">{value}</dd>
    </div>
  );
}

function MethodBtn({ active, onClick, icon: Icon, label, sub }: { active: boolean; onClick: () => void; icon: React.FC<{ active: boolean }>; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-start gap-3 border p-4 text-left transition-colors " +
        (active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")
      }
    >
      <Icon active={active} />
      <div>
        <div className="text-[13px] font-medium uppercase tracking-[0.14em]">{label}</div>
        <div className={"mt-0.5 text-[10px] uppercase tracking-[0.18em] " + (active ? "opacity-70" : "text-muted-foreground")}>{sub}</div>
      </div>
    </button>
  );
}

function BrandPill({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.14em] border border-border px-1.5 py-0.5">{children}</span>;
}

const CardIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={active ? "" : "text-foreground"}>
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h2"/>
  </svg>
);
const UpiIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={active ? "" : "text-foreground"}>
    <path d="m6 3 4 18"/><path d="M14 3h4l-4 18h4"/>
  </svg>
);
const BankIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={active ? "" : "text-foreground"}>
    <path d="m3 9 9-6 9 6"/><path d="M5 9v10"/><path d="M9 9v10"/><path d="M15 9v10"/><path d="M19 9v10"/><path d="M3 21h18"/>
  </svg>
);
const WalletIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={active ? "" : "text-foreground"}>
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="17" cy="14" r="1.4"/>
  </svg>
);
