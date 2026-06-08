import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListCommissions } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/sales")({
  head: () => ({ meta: [{ title: "Sales & Commissions" }] }),
  component: Sales,
});

function Sales() {
  const list = useServerFn(adminListCommissions);
  const { data } = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => list() });
  const total = (data ?? []).reduce((a: number, c: any) => a + Number(c.commission_amount), 0);
  const pending = (data ?? []).filter((c: any) => c.payout_status === "pending").reduce((a: number, c: any) => a + Number(c.commission_amount), 0);

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Commission Ledger</div>
      <h1 className="mt-3 font-serif text-5xl">Sales</h1>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Stat label="Total commission" value={"$" + total.toLocaleString()} />
        <Stat label="Pending payout" value={"$" + pending.toLocaleString()} />
        <Stat label="Owner UPI" value="9346739056@ybl" mono />
      </div>

      <div className="mt-6 border border-border p-4 bg-muted/30 text-[12px] text-muted-foreground">
        Razorpay auto-split to UPI is not connected yet. Commissions are tracked here; once you provide Razorpay credentials, payouts will transfer automatically on each sale.
      </div>

      <table className="mt-10 w-full text-[13px]">
        <thead className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <tr><th className="py-3">Lot</th><th>Hammer</th><th>Commission</th><th>Status</th><th>Ref</th><th>When</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((c: any) => (
            <tr key={c.id} className="border-b border-border">
              <td className="py-4 font-serif">{c.lots?.artist} — <span className="italic">{c.lots?.title}</span></td>
              <td>${Number(c.hammer_price).toLocaleString()}</td>
              <td className="font-medium">${Number(c.commission_amount).toLocaleString()}</td>
              <td><span className="font-mono text-[10px] uppercase tracking-[0.18em]">{c.payout_status}</span></td>
              <td className="font-mono text-[11px]">{c.payout_ref ?? "—"}</td>
              <td className="font-mono text-[11px]">{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {(data ?? []).length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No sales yet.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-border p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={`mt-3 ${mono ? "font-mono text-2xl" : "font-serif text-4xl"}`}>{value}</div>
    </div>
  );
}
