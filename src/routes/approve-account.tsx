import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { approveAccountFromEmail } from "@/lib/auction.functions";

export const Route = createFileRoute("/approve-account")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    status: search.status === "suspended" ? "suspended" as const : "approved" as const,
  }),
  component: ApprovalPage,
});

function ApprovalPage() {
  const { token, status } = Route.useSearch();
  const approve = useServerFn(approveAccountFromEmail);
  const { data, isLoading } = useQuery({
    queryKey: ["approve-account", token, status],
    queryFn: () => approve({ data: { token, status } }),
    enabled: !!token,
    retry: false,
  });

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-lg w-full border border-border p-8 md:p-12">
        <div className="font-serif text-3xl">Kalashetra</div>
        <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Account approval</div>
        <h1 className="mt-4 font-serif text-4xl">{isLoading ? "Updating account…" : data?.ok ? (status === "approved" ? "Account approved." : "Account rejected.") : "Approval link unavailable."}</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{data?.message ?? (isLoading ? "Please wait." : "This link may be expired or invalid.")}</p>
      </div>
    </main>
  );
}
