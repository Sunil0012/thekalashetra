import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

const NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/sessions", label: "Sessions" },
  { to: "/admin/registrations", label: "Registrations" },
  { to: "/admin/requests", label: "Admin Requests" },
  { to: "/admin/consignments", label: "Consignments" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/sales", label: "Sales" },
];

function AdminGate() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Verifying access…</div>
      </div>
    );
  }
  if (!isAdmin) return null;
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <div className="border-b border-border">
        <nav className="mx-auto max-w-[1400px] px-6 md:px-10 flex items-center gap-7 overflow-x-auto text-[11px] font-medium uppercase tracking-[0.18em]">
          {NAV.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={
                  "py-4 whitespace-nowrap border-b-2 -mb-px transition-colors " +
                  (active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
      <SiteFooter />
    </div>
  );
}
