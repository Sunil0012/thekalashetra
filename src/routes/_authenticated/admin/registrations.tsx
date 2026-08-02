import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminListRegistrations, adminDecideRegistration } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  head: () => ({ meta: [{ title: "Bidder Registrations — Admin" }] }),
  component: AdminRegistrations,
});

function AdminRegistrations() {
  const list = useServerFn(adminListRegistrations);
  const decide = useServerFn(adminDecideRegistration);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "registrations"],
    queryFn: () => list({ data: {} }),
    refetchInterval: 20_000,
  });

  const m = useMutation({
    mutationFn: (p: { id: string; approve: boolean }) => decide({ data: p }),
    onSuccess: (_d, p) => {
      toast.success(p.approve ? "Bidder approved" : "Registration declined");
      qc.invalidateQueries({ queryKey: ["admin", "registrations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (data ?? []) as any[];
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Bidder Approvals</div>
      <h1 className="mt-3 font-serif text-5xl">Registrations</h1>
      <p className="mt-3 text-[13px] text-muted-foreground max-w-2xl">
        Every bidder must be cleared for a session before they can place a bid. Approvals here unlock bidding instantly.
      </p>

      <Section title={`Pending (${pending.length})`} rows={pending} onDecide={(id, approve) => m.mutate({ id, approve })} busy={m.isPending} empty={isLoading ? "Loading…" : "No pending requests."} />
      <Section title="Decided" rows={decided} empty="Nothing decided yet." />
    </main>
  );
}

function Section({ title, rows, onDecide, busy, empty }: { title: string; rows: any[]; onDecide?: (id: string, approve: boolean) => void; busy?: boolean; empty: string }) {
  return (
    <div className="mt-12">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground border-b border-border pb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-8 text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border border-b border-border">
          {rows.map((r) => (
            <li key={r.id} className="py-5 grid md:grid-cols-[1fr_auto_auto] gap-4 items-center">
              <div>
                <div className="font-serif text-xl">{r.profiles?.full_name ?? r.profiles?.email ?? "Bidder"}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {r.profiles?.email} · {r.auction_sessions?.title ?? "Session"} · requested {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 border ${r.status === "approved" ? "border-foreground" : r.status === "rejected" ? "border-red-500 text-red-500" : "border-border text-muted-foreground"}`}>
                {r.status}
              </span>
              {onDecide && (
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => onDecide(r.id, true)} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">Approve</button>
                  <button disabled={busy} onClick={() => onDecide(r.id, false)} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500 disabled:opacity-50">Decline</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
