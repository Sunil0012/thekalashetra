import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminListConsignments, adminDecideConsignment } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/consignments")({
  head: () => ({ meta: [{ title: "Consignments — Admin" }] }),
  component: AdminConsignments,
});

function AdminConsignments() {
  const list = useServerFn(adminListConsignments);
  const decide = useServerFn(adminDecideConsignment);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "consignments"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (p: any) => decide({ data: p }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin", "consignments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Seller Verification</div>
      <h1 className="mt-3 font-serif text-5xl">Consignments</h1>

      <ul className="mt-10 divide-y divide-border border-y border-border">
        {(data ?? []).map((c: any) => (
          <li key={c.id} className="py-6 grid md:grid-cols-[1fr_auto] gap-4">
            <div>
              <div className="font-serif text-xl">{c.artist} — <span className="italic">{c.title}</span> {c.year ? `(${c.year})` : ""}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.medium} · {c.dimensions}</div>
              <div className="mt-2 text-[13px] text-muted-foreground">Est. ${Number(c.estimated_value || 0).toLocaleString()}</div>
              <p className="mt-3 text-[13px] max-w-2xl">{c.description}</p>
              <div className="mt-3 text-[12px]">
                <strong>{c.contact_name}</strong> · {c.contact_email}{c.contact_phone ? ` · ${c.contact_phone}` : ""}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Status: {c.status} · {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
            {c.status === "pending" && (
              <div className="flex md:flex-col gap-2">
                <button disabled={m.isPending} onClick={() => m.mutate({ id: c.id, approve: true })} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Verify & Approve</button>
                <button disabled={m.isPending} onClick={() => m.mutate({ id: c.id, approve: false })} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Reject</button>
              </div>
            )}
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="py-12 text-center text-muted-foreground text-[13px]">No consignments yet.</li>}
      </ul>
    </main>
  );
}
