import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { adminListRequests, decideAdminRequest } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({ meta: [{ title: "Admin Requests" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const { isOwner } = useAuth();
  const list = useServerFn(adminListRequests);
  const decide = useServerFn(decideAdminRequest);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "requests"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (p: { id: string; approve: boolean }) => decide({ data: p }),
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["admin", "requests"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Admin Requests</div>
      <h1 className="mt-3 font-serif text-5xl">Approvals</h1>
      {!isOwner && <p className="mt-4 text-[13px] text-muted-foreground">Only the owner can approve admin requests.</p>}

      <ul className="mt-10 divide-y divide-border border-y border-border">
        {(data ?? []).map((r: any) => (
          <li key={r.id} className="py-6 grid md:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <div className="font-serif text-xl">{r.full_name ?? r.email}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{r.email}</div>
              <p className="mt-3 text-[13px] max-w-2xl whitespace-pre-wrap">{r.reason}</p>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Status: {r.status} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            {r.status === "pending" && isOwner && (
              <div className="flex gap-2">
                <button disabled={m.isPending} onClick={() => m.mutate({ id: r.id, approve: true })} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Approve</button>
                <button disabled={m.isPending} onClick={() => m.mutate({ id: r.id, approve: false })} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Reject</button>
              </div>
            )}
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="py-12 text-center text-muted-foreground text-[13px]">No requests yet.</li>}
      </ul>
    </main>
  );
}
