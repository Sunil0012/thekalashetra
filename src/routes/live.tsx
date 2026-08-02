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

type SlotState = "live" | "soon" | "closed";

/** A slot is only "open now" when the admin has set it live AND we are inside the window. */
function slotState(s: any, now: number): SlotState {
  const start = new Date(s.starts_at).getTime();
  const end = new Date(s.ends_at).getTime();
  if (s.status === "ended" || now >= end) return "closed";
  if (s.status === "live" && now >= start) return "live";
  return "soon";
}

function LivePage() {
  const now = useNow(1000);
  const fn = useServerFn(listLiveSlots);
  const { data, isLoading } = useQuery({
    queryKey: ["live-slots"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });

  const sessions = data?.sessions ?? [];
  const lots = data?.lots ?? [];
  const live = sessions.filter((s: any) => slotState(s, now) === "live");
  const soon = sessions.filter((s: any) => slotState(s, now) === "soon");
  const past = sessions.filter((s: any) => slotState(s, now) === "closed");

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

function Group({ title, empty, sessions, lots, state }: { title: string; empty: string; sessions: any[]; lots: any[]; state: SlotState }) {
  if (sessions.length === 0 && !empty) return null;
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground border-b border-border pb-4">{title}</h2>
      {sessions.length === 0 ? (
        <p className="py-10 text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border border-b border-border">
          {sessions.map((s) => (
            <SlotRow key={s.id} session={s} lots={lots.filter((l) => l.session_id === s.id)} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotRow({ session, lots, state }: { session: any; lots: any[]; state: SlotState }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const regFn = useServerFn(registerForSession);
  const myRegFn = useServerFn(getMyRegistration);
  const { data: reg } = useQuery({
    queryKey: ["registration", session.id, user?.id],
    queryFn: () => myRegFn({ data: { sessionId: session.id } }),
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const register = useMutation({
    mutationFn: () => regFn({ data: { sessionId: session.id } }),
    onSuccess: () => { toast.success("Registration requested — awaiting admin approval."); qc.invalidateQueries({ queryKey: ["registration", session.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const minutes = session.duration_minutes ?? Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000);
  const durationLabel = minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} hr slot` : `${minutes} min slot`;
  const startPassed = Date.now() >= new Date(session.starts_at).getTime();

  return (
    <article className="grid lg:grid-cols-[minmax(260px,340px)_1fr_auto] gap-8 py-8 items-start">
      {/* Column 1 — the slot */}
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {state === "live" && <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-red-500"><span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> Bidding open</span>}
          {state === "soon" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {startPassed ? "Awaiting host to open" : <>Opens in {formatCountdown(session.starts_at)}</>}
            </span>
          )}
          {state === "closed" && <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Closed</span>}
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">· {durationLabel}</span>
        </div>
        <h3 className="mt-3 font-serif text-3xl leading-tight">{session.title}</h3>
        {session.description && <p className="mt-3 text-[13.5px] text-muted-foreground leading-relaxed">{session.description}</p>}
        <div className="mt-4 font-mono text-[11px] text-muted-foreground">
          {new Date(session.starts_at).toLocaleString()} → {new Date(session.ends_at).toLocaleString()}
        </div>
      </div>

      {/* Column 2 — lots, horizontal rail */}
      <div className="min-w-0">
        {lots.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Lots for this slot are being catalogued.</p>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-2">
            {lots.map((l) => (
              <Link key={l.id} to="/lot/$id" params={{ id: l.id }} className="group shrink-0 w-[180px]">
                {l.image_url && (
                  <div className="aspect-[4/5] bg-muted overflow-hidden mb-3">
                    <img src={l.image_url} alt={`${l.artist} — ${l.title}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                )}
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Lot {l.lot_number}</div>
                <div className="mt-1 text-[12.5px] font-medium truncate">{l.artist}</div>
                <div className="font-serif text-[15px] italic leading-tight truncate">{l.title}</div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {state === "live" ? "Current" : "Opening"} {formatBid(state === "live" ? l.current_bid : l.starting_bid)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Column 3 — status / action */}
      <div className="lg:text-right space-y-3 lg:w-[220px]">
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
    </article>
  );
}
