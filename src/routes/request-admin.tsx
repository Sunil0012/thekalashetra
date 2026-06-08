import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { useAuth } from "@/hooks/use-auth";
import { requestAdmin } from "@/lib/auction.functions";

export const Route = createFileRoute("/request-admin")({
  head: () => ({ meta: [{ title: "Request Admin — Kalashetra" }] }),
  component: RequestAdminPage,
});

function RequestAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fn = useServerFn(requestAdmin);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-20">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">· Administrative Access</div>
        <h1 className="mt-4 font-serif text-5xl">Become an admin.</h1>
        <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed">
          Admins can create auction sessions, add and remove lots, and review consignments. Your request will be reviewed by the owner (sunilnaikkethavath@gmail.com).
        </p>

        {!user ? (
          <div className="mt-10 border border-border p-6">
            <p className="text-[13px]">Please sign in to request admin access.</p>
            <Link to="/auth" search={{ redirect: "/request-admin" } as any} className="inline-block mt-4 bg-foreground text-background px-5 py-3 text-[11px] uppercase tracking-[0.18em]">Sign in</Link>
          </div>
        ) : sent ? (
          <div className="mt-10 border border-border p-6">
            <h3 className="font-serif text-2xl">Request submitted.</h3>
            <p className="mt-2 text-[13px] text-muted-foreground">You'll be notified once the owner reviews it.</p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await fn({ data: { reason } });
                toast.success("Request sent to the owner");
                setSent(true);
              } catch (err: any) {
                toast.error(err.message || "Failed");
              } finally { setBusy(false); }
            }}
            className="mt-10 space-y-6"
          >
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Why should we grant you admin access?</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={10}
                rows={6}
                placeholder="Briefly describe your experience with auctions, galleries, or art handling…"
                className="w-full bg-transparent border border-border p-4 text-[14px] focus:outline-none focus:border-foreground resize-none"
              />
            </div>
            <button disabled={busy} className="bg-foreground text-background px-6 py-4 text-[11px] uppercase tracking-[0.22em] disabled:opacity-50">
              {busy ? "Sending…" : "Submit Request"}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
