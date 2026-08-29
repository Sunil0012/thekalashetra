import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { getMyAccount } from "@/lib/auction.functions";
import { formatBid } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Kalashetra" }] }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, accountStatus } = useAuth();
  const fn = useServerFn(getMyAccount);
  const { data, isLoading } = useQuery({ queryKey: ["my-account"], queryFn: () => fn(), enabled: !!user });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/account" } as never });
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const name = (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "Collector";
  const bids = data?.bids ?? [];
  const consignments = data?.consignments ?? [];
  const adminRequest = data?.adminRequest ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-24 pb-16">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Account</div>
        <h1 className="font-serif text-5xl md:text-6xl tracking-tight mt-6">Welcome, {name.split(" ")[0]}.</h1>
        <p className="mt-4 text-[14px] text-muted-foreground">{user.email}</p>
        {accountStatus === "pending" && (
          <div className="mt-6 max-w-2xl border border-border p-5 text-[13px] leading-relaxed">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em]">Membership pending approval</div>
            <p className="mt-3 text-muted-foreground">Your account is under review by the Kalashetra team. You can browse the catalogue now; once approved, you can bid in standard auctions. Live bidding slots require a separate request to the admin.</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-4">
          {isAdmin ? (
            <Link to="/admin" className="border border-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors">Admin dashboard →</Link>
          ) : (
            <Link to="/request-admin" className="text-[11px] uppercase tracking-[0.18em] underline underline-offset-4 text-muted-foreground hover:text-foreground">Request admin access</Link>
          )}
        </div>
      </section>

      <Section title="Your bids" empty={isLoading ? "Loading…" : "You haven't placed any bids yet."}>
        {bids.map((b: any) => {
          const lot = b.lots;
          if (!lot) return null;
          const winning = Number(b.amount) === Number(lot.current_bid);
          return (
            <Link key={b.id} to="/lot/$id" params={{ id: lot.id }} className="grid grid-cols-[80px_1fr_auto_auto] gap-6 items-center py-5 border-b border-border group">
              <div className="w-20 h-20 bg-muted overflow-hidden">
                <img src={lot.image_url ?? ""} alt={lot.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-serif text-lg">{lot.artist}</div>
                <div className="font-serif italic text-[13px] text-muted-foreground">{lot.title}{lot.year ? `, ${lot.year}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Your bid</div>
                <div className="font-serif text-lg">{formatBid(b.amount)}</div>
              </div>
              <div className="text-right">
                <div className={"font-mono text-[10px] uppercase tracking-[0.18em] " + (lot.status === "sold" && lot.sold_to === user.id ? "text-foreground" : winning ? "text-foreground" : "text-live")}>
                  {lot.status === "sold" ? (lot.sold_to === user.id ? "Won" : "Sold") : winning ? "Winning" : "Outbid"}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">Current {formatBid(lot.current_bid)}</div>
              </div>
            </Link>
          );
        })}
      </Section>

      <Section title="Your consignments" empty={isLoading ? "Loading…" : "No consignments submitted. Visit the Sell page to consign a work."}>
        {consignments.map((c: any) => (
          <div key={c.id} className="grid grid-cols-[1fr_auto_auto] gap-6 items-center py-5 border-b border-border">
            <div>
              <div className="font-serif text-lg">{c.artist}</div>
              <div className="font-serif italic text-[13px] text-muted-foreground">{c.title}</div>
            </div>
            <div className="text-right font-mono text-[11px] text-muted-foreground">
              {c.estimated_value ? `Est. ${formatBid(c.estimated_value)}` : "—"}
            </div>
            <div className={"text-right font-mono text-[10px] uppercase tracking-[0.18em] " + (c.status === "approved" ? "text-foreground" : c.status === "rejected" ? "text-live" : "text-muted-foreground")}>
              {c.status}
            </div>
          </div>
        ))}
      </Section>

      {adminRequest && (
        <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-16">
          <div className="border border-border p-7 max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin request</div>
            <div className="mt-3 text-[14px]">
              Status: <span className="font-mono uppercase tracking-[0.14em]">{adminRequest.status}</span>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{adminRequest.reason}</p>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-16">
      <h2 className="font-serif text-3xl border-b border-border pb-4">{title}</h2>
      {hasChildren ? <div>{children}</div> : <p className="py-8 text-[13px] text-muted-foreground">{empty}</p>}
    </section>
  );
}
