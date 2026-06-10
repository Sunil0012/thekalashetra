import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { getLot, placeBid } from "@/lib/auction.functions";
import { formatBid, formatCountdown, nextMinIncrement } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";

export const Route = createFileRoute("/lot/$id")({
  component: LotPage,
});

function NotFoundLot() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[1400px] px-10 py-32 text-center">
        <h1 className="font-serif text-5xl">Lot not found</h1>
        <Link to="/auctions" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">Back to auctions</Link>
      </div>
      <SiteFooter />
    </div>
  );
}

function LotPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  useNow(1000);

  const fetchLot = useServerFn(getLot);
  const bidFn = useServerFn(placeBid);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lot", id],
    queryFn: () => fetchLot({ data: { id } }),
    refetchInterval: 15_000,
    retry: false,
  });

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="py-40 text-center text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Loading lot…</div>
      </div>
    );
  }
  if (isError || !data?.lot) return <NotFoundLot />;

  const { lot, session, bids } = data as any;
  const isLive = session?.status === "live";
  const isEnded = session?.status === "ended" || lot.status === "sold";
  const current = Number(lot.current_bid || lot.starting_bid || 0);
  const minNext = current + nextMinIncrement(current);
  const iAmHighBidder = !!user && bids?.[0]?.user_id === user.id;
  const wonByMe = isEnded && lot.status !== "sold" && iAmHighBidder;
  const boughtByMe = !!user && lot.status === "sold" && lot.sold_to === user.id;

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/lot/${lot.id}` } as never });
      return;
    }
    const n = Number(amount.replace(/[^0-9.]/g, ""));
    if (!n || Number.isNaN(n)) { toast.error("Enter a numeric amount."); return; }
    if (n < minNext) { toast.error(`Minimum next bid is ${formatBid(minNext)}.`); return; }
    setBusy(true);
    try {
      await bidFn({ data: { lotId: lot.id, amount: n } });
      toast.success(`Bid placed at ${formatBid(n)} — you're the high bidder.`);
      setAmount("");
      qc.invalidateQueries({ queryKey: ["lot", id] });
      qc.invalidateQueries({ queryKey: ["catalogue"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Bid failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8">
        <Link to="/auctions" className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
          ← Back to auctions
        </Link>
      </div>

      <article className="mx-auto max-w-[1400px] px-6 md:px-10 pt-8 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="bg-muted aspect-square overflow-hidden">
          <img
            src={lot.image_url ?? ""}
            alt={`${lot.title} by ${lot.artist}`}
            width={1024}
            height={1024}
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lot {lot.lot_number} · {lot.category ?? "—"} · {session?.title}
            </div>
            <div className="flex items-center gap-1.5">
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />}
              <span className={"font-mono text-[10px] uppercase tracking-[0.18em] " + (isLive ? "text-live" : "text-muted-foreground")}>
                {lot.status === "sold" ? "Sold" : session?.status ?? "—"}
              </span>
            </div>
          </div>

          <h1 className="mt-6 font-serif text-4xl md:text-5xl leading-tight">
            {lot.artist}
            <br />
            <span className="italic font-light">{lot.title}{lot.year ? `, ${lot.year}` : ""}</span>
          </h1>

          <dl className="mt-8 grid grid-cols-2 gap-y-3 text-[13px] border-y border-border py-6">
            {lot.medium && (<><dt className="text-muted-foreground">Medium</dt><dd>{lot.medium}</dd></>)}
            {lot.dimensions && (<><dt className="text-muted-foreground">Dimensions</dt><dd>{lot.dimensions}</dd></>)}
            {lot.provenance && (<><dt className="text-muted-foreground">Provenance</dt><dd>{lot.provenance}</dd></>)}
            <dt className="text-muted-foreground">Starting bid</dt><dd>{formatBid(lot.starting_bid)}</dd>
          </dl>

          {lot.description && (
            <p className="mt-6 text-[14px] leading-relaxed text-muted-foreground">{lot.description}</p>
          )}

          {/* BID PANEL */}
          <div className="mt-10 border border-border p-7">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {lot.status === "sold" ? "Sold for" : "Current bid"}
                </div>
                <div className="mt-2 font-serif text-4xl">{formatBid(lot.status === "sold" ? lot.sold_price : current)}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{lot.bid_count} {lot.bid_count === 1 ? "bid" : "bids"}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {isLive ? "Closes in" : session?.status === "upcoming" ? "Opens in" : "Status"}
                </div>
                <div className={"mt-2 font-mono text-xl " + (isLive ? "text-live" : "")}>
                  {isLive ? formatCountdown(session?.ends_at) : session?.status === "upcoming" ? formatCountdown(session?.starts_at) : "Closed"}
                </div>
              </div>
            </div>

            {isLive && lot.status !== "sold" && (
              <form onSubmit={handleBid} className="mt-7 space-y-3">
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Your bid (min {formatBid(minNext)})
                </label>
                <div className="flex gap-3">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(minNext)}
                    inputMode="numeric"
                    className="flex-1 border-b border-border bg-transparent px-0 py-3 text-xl font-serif focus:outline-none focus:border-foreground"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-foreground text-background px-7 py-3 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "Placing…" : user ? "Place bid" : "Sign in to bid"}
                  </button>
                </div>
                {iAmHighBidder && <p className="font-mono text-[11px] text-live">You are the current high bidder.</p>}
              </form>
            )}

            {(wonByMe || boughtByMe) && (
              <div className="mt-7 border-t border-border pt-6">
                {boughtByMe ? (
                  <p className="text-[13px] text-muted-foreground">You purchased this lot. View it in your <Link to="/account" className="underline underline-offset-4">account</Link>.</p>
                ) : (
                  <>
                    <p className="text-[13px]">The session has closed and you hold the winning bid.</p>
                    <Link
                      to="/checkout"
                      search={{ lot: lot.id } as never}
                      className="mt-4 inline-block bg-foreground text-background px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em]"
                    >
                      Proceed to checkout →
                    </Link>
                  </>
                )}
              </div>
            )}

            {session?.status === "upcoming" && (
              <p className="mt-6 text-[13px] text-muted-foreground">Bidding opens when the session goes live. Check back soon.</p>
            )}
          </div>

          {/* BID HISTORY */}
          {bids?.length > 0 && (
            <div className="mt-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Bid history</div>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {bids.map((b: any, i: number) => (
                  <li key={`${b.created_at}-${i}`} className="flex items-center justify-between py-3 text-[13px]">
                    <span className="font-serif text-lg">{formatBid(b.amount)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {user && b.user_id === user.id ? "You · " : ""}
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
