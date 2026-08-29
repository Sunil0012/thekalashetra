import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { adminListNotifications, adminListRequests, adminListConsignments, adminListAllSessions, adminListCommissions, adminListRegistrations, adminListUsers } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Kalashetra" }] }),
  component: AdminIndex,
});

function AdminIndex() {
  const fNotif = useServerFn(adminListNotifications);
  const fReq = useServerFn(adminListRequests);
  const fCon = useServerFn(adminListConsignments);
  const fSes = useServerFn(adminListAllSessions);
  const fCom = useServerFn(adminListCommissions);
  const fReg = useServerFn(adminListRegistrations);
  const fUsers = useServerFn(adminListUsers);

  const notif = useQuery({ queryKey: ["admin", "notif"], queryFn: () => fNotif() });
  const req = useQuery({ queryKey: ["admin", "req"], queryFn: () => fReq() });
  const con = useQuery({ queryKey: ["admin", "con"], queryFn: () => fCon() });
  const ses = useQuery({ queryKey: ["admin", "ses"], queryFn: () => fSes() });
  const com = useQuery({ queryKey: ["admin", "com"], queryFn: () => fCom() });
  const reg = useQuery({ queryKey: ["admin", "registrations"], queryFn: () => fReg({ data: {} }), refetchInterval: 20_000 });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => fUsers(), refetchInterval: 20_000 });

  const pendingReq = (req.data ?? []).filter((r: any) => r.status === "pending").length;
  const pendingReg = (reg.data ?? []).filter((r: any) => r.status === "pending").length;
  const pendingCon = (con.data ?? []).filter((c: any) => c.status === "pending").length;
  const pendingAccounts = (users.data ?? []).filter((u: any) => u.account_status === "pending").length;
  const liveSes = (ses.data ?? []).filter((s: any) => s.status === "live").length;
  const totalCommission = (com.data ?? []).reduce((a: number, c: any) => a + Number(c.commission_amount || 0), 0);

  const cards = [
    { label: "Sessions", to: "/admin/sessions", value: ses.data?.length ?? 0, sub: `${liveSes} live` },
    { label: "Bidder Registrations", to: "/admin/registrations", value: pendingReg, sub: "awaiting approval" },
    { label: "Admin Requests", to: "/admin/requests", value: pendingReq, sub: "pending" },
    { label: "Member Approvals", to: "/admin/users", value: pendingAccounts, sub: "awaiting approval" },
    { label: "Consignments", to: "/admin/consignments", value: pendingCon, sub: "to verify" },
    { label: "Commission Owed", to: "/admin/sales", value: "₹" + totalCommission.toLocaleString("en-IN"), sub: "→ 9346739056@ybl" },
  ];

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Admin Console</div>
      <h1 className="mt-4 font-serif text-5xl md:text-6xl tracking-tight">Dashboard</h1>
      <p className="mt-3 text-[14px] text-muted-foreground max-w-2xl">Manage sessions, lots, approvals, and commission ledger.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to as any} className="border border-border p-6 hover:border-foreground transition-colors">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.label}</div>
            <div className="mt-4 font-serif text-4xl">{c.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{c.sub}</div>
          </Link>
        ))}
      </div>

      <section className="mt-16">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="font-serif text-2xl">Activity</h2>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Latest 10</div>
        </div>
        <ul className="divide-y divide-border">
          {(notif.data ?? []).slice(0, 10).map((n: any) => (
            <li key={n.id} className="py-4 flex items-start justify-between gap-6">
              <div>
                <div className="text-[13px] font-medium">{n.title}</div>
                {n.body && <div className="mt-1 text-[12px] text-muted-foreground">{n.body}</div>}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </li>
          ))}
          {(notif.data ?? []).length === 0 && (
            <li className="py-8 text-center text-[12px] text-muted-foreground">No activity yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
