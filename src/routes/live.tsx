import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { listLiveSlots, registerForSession, getMyRegistration } from "@/lib/auction.functions";
import { formatCountdown, formatBid } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Bidding Slots — Kalashetra" },
      { name: "description", content: "Timed live bidding slots at Kalashetra. Register in advance and bid only during the window set by our specialists." },
      { property: "og:title", content: "Live Bidding Slots — Kalashetra" },
      { property: "og:description", content: "Timed live bidding windows for curated fine art lots. Register early, bid when the slot opens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  useNow(1000);
  const fn = useServerFn(listLiveSlots);
  const { data, isLoading } = useQuery({ queryKey: ["live-slots"], queryFn: () => fn() });

  const sessions = data?.sessions ?? [];
  const lots = data?.lots ?? [];
  const now = Date.now();
  const live = sessions.filter((s: any) => s.status === "live" && new Date(s.ends_at).getTime() > now);
  const soon = sessions.filter((s: any) => s.status === "upcoming" || (s.status === "live" && new Date(s.starts_at).getTime() > now));
  const past = sessions.filter((s: any) => s.status === "ended" || (s.status !== "upcoming" && new Date(s.ends_at).getTime() <= now));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-20 pb-12">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">· Timed Windows</div>
        <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-6">Live <span className="italic font-light">Bidding</span></h1>
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Short, high-intensity sessions. Our specialists set an exact window — one hour, three hours, or longer — and bidding is
          accepted only while that slot is open. Register in advance so you're cleared the moment it begins.
        </p>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 md:px-10 pb-24 space-y-16">
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground text-[13px]">Loading slots…</div>
        ) : sessions.length === 0 ? (
          <div className="py-24 text-center border-y border-border">
            <p className="font-serif text-2xl italic">No live bidding slots scheduled yet.</p>
            <Link to="/auctions" className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">Browse standard auctions</Link>
          </div>
        ) : (
          <>
            <Group title="Open now" empty="No slot is open at this moment." sessions={live} lots={lots} state="live" />
            <Group title="Starting soon" empty="Nothing queued right now." sessions={soon} lots={lots} state="soon" />
            <Group title="Closed slots" empty="" sessions={past} lots={lots} state="closed" />
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function Group({ title, empty, sessions, lots, state }: { title: string; empty: string; sessions: any[]; lots: any[]; state: "live" | "soon" | "closed" }) {
  if (sessions.length === 0 && !empty) return null;
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground border-b border-border pb-4">{title}</h2>
      {sessions.length === 0 ? (
        <p className="py-10 text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-8 space-y-10">
          {sessions.map((s) => (
            <SlotCard key={s.id} session={s} lots={lots.filter((l) => l.session_id === s.id)} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({ session, lots, state }: { session: any; lots: any[]; state: "live" | "soon" | "closed" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const regFn = useServerFn(registerForSession);
  const myRegFn = useServerFn(getMyRegistration);
  const { data: reg } = useQuery({
    queryKey: ["registration", session.id, user?.id],
    queryFn: () => myRegFn({ data: { sessionId: session.id } }),
    enabled: !!user,
  });
  const register = useMutation({
    mutationFn: () => regFn({ data: { sessionId: session.id } }),
    onSuccess: () => { toast.success("Registration requested — awaiting admin approval."); qc.invalidateQueries({ queryKey: ["registration", session.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const minutes = session.duration_minutes ?? Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000);
  const durationLabel = minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} hr slot` : `${minutes} min slot`;

  return (
    <article className="border border-border">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 p-8 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            {state === "live" && <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-red-500"><span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> Bidding open</span>}
            {state === "soon" && <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Opens in {formatCountdown(session.starts_at)}</span>}
            {state === "closed" && <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Closed</span>}
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">· {durationLabel}</span>
          </div>
          <h3 className="mt-3 font-serif text-3xl">{session.title}</h3>
          {session.description && <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground leading-relaxed">{session.description}</p>}
          <div className="mt-5 font-mono text-[11px] text-muted-foreground">
            {new Date(session.starts_at).toLocaleString()} → {new Date(session.ends_at).toLocaleString()}
          </div>
        </div>
        <div className="md:text-right space-y-3">
          {state === "live" && (
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]">Closes in <span className="text-red-500">{formatCountdown(session.ends_at)}</span></div>
          )}
          {state !== "closed" && (
            !user ? (
              <Link to="/auth" search={{ redirect: "/live" }} className="inline-block border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors">Sign in to register</Link>
            ) : reg?.status === "approved" ? (
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">✓ Approved to bid</div>
            ) : reg?.status === "pending" ? (
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Registration pending approval</div>
            ) : reg?.status === "rejected" ? (
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-red-500">Registration declined</div>
            ) : (
              <button onClick={() => register.mutate()} disabled={register.isPending} className="border border-foreground px-5 py-3 text-[11px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors disabled:opacity-50">
                {register.isPending ? "Requesting…" : "Register to bid"}
              </button>
            )
          )}
        </div>
      </div>

      {lots.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {lots.map((l) => (
            <Link key={l.id} to="/lot/$id" params={{ id: l.id }} className="group border-r border-b border-border last:border-r-0 p-5 hover:bg-muted/40 transition-colors">
              {l.image_url && (
                <div className="aspect-[4/5] bg-muted overflow-hidden mb-4">
                  <img src={l.image_url} alt={`${l.artist} — ${l.title}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Lot {l.lot_number}</div>
              <div className="mt-1.5 text-[13px] font-medium">{l.artist}</div>
              <div className="font-serif text-lg italic leading-tight">{l.title}</div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                {state === "live" ? "Current" : "Opening"} {formatBid(state === "live" ? l.current_bid : l.starting_bid)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
