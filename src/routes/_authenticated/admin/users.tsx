import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { adminListUsers, adminSetRole, adminRemoveUser, adminSetAccountStatus, adminResendAccountApprovalEmail } from "@/lib/auction.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const { isOwner, isAdmin: currentIsAdmin } = useAuth();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetRole);
  const removeUser = useServerFn(adminRemoveUser);
  const setStatus = useServerFn(adminSetAccountStatus);
  const resendEmail = useServerFn(adminResendAccountApprovalEmail);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "users"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: (p: { userId: string; grant: boolean }) => setRole({ data: p }),
    onSuccess: () => { toast.success("Roles updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const rm = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => { toast.success("User removed"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusMutation = useMutation({
    mutationFn: (p: { userId: string; status: "approved" | "suspended" }) => setStatus({ data: p }),
    onSuccess: () => { toast.success("Account status updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const resendMutation = useMutation({
    mutationFn: (userId: string) => resendEmail({ data: { userId } }),
    onSuccess: () => toast.success("Approval email sent"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 mx-auto max-w-[1400px] w-full px-6 md:px-10 py-12">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· User Management</div>
      <h1 className="mt-3 font-serif text-5xl">Users</h1>
      {!isOwner && <p className="mt-4 text-[13px] text-muted-foreground">Only the owner can promote or demote admins.</p>}

      <ul className="mt-10 divide-y divide-border border-y border-border">
        {(data ?? []).map((u: any) => {
          const rowIsAdmin = u.roles.includes("admin");
          const isOwnerRow = u.roles.includes("owner");
          return (
            <li key={u.id} className="py-5 grid md:grid-cols-[1fr_auto_auto] gap-4 items-center">
              <div>
                <div className="font-serif text-xl">{u.full_name ?? u.email}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{u.email} · joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.account_status === "pending" && (
                  <>
                    <button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ userId: u.id, status: "approved" })} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Approve account</button>
                    <button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ userId: u.id, status: "suspended" })} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500">Reject</button>
                    <button disabled={resendMutation.isPending} onClick={() => resendMutation.mutate(u.id)} className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">Resend email</button>
                  </>
                )}
                <span className={`px-3 py-1.5 border font-mono text-[10px] uppercase tracking-[0.18em] ${u.account_status === "approved" ? "border-foreground" : "border-border text-muted-foreground"}`}>{u.account_status ?? "pending"}</span>
              </div>
              <div className="flex gap-2">
                {(u.roles.length ? u.roles : ["user"]).map((r: string) => (
                  <span key={r} className={`font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 border ${r === "owner" ? "border-foreground" : "border-border text-muted-foreground"}`}>{r}</span>
                ))}
              </div>
              {currentIsAdmin && !isOwnerRow && (
                <div className="flex gap-2">
                <button
                  disabled={m.isPending}
                  onClick={() => m.mutate({ userId: u.id, grant: !rowIsAdmin })}
                  className={rowIsAdmin
                    ? "border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500"
                    : "bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]"}
                >
                  {rowIsAdmin ? "Remove admin" : "Make admin"}
                </button>
                <button
                  disabled={rm.isPending}
                  onClick={() => { if (confirm(`Permanently remove ${u.email}? This deletes their account.`)) rm.mutate(u.id); }}
                  className="border border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                >
                  Remove
                </button>
                </div>
              )}
            </li>
          );
        })}
        {(data ?? []).length === 0 && <li className="py-12 text-center text-muted-foreground text-[13px]">No users yet.</li>}
      </ul>
    </main>
  );
}
