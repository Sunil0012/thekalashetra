import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "",
    state: typeof search.state === "string" ? search.state : "",
  }),
  ssr: false,
  beforeLoad: async ({ search }) => {
    if (!search.code) {
      throw redirect({ to: "/auth" });
    }

    try {
      const { handleGoogleCallback } = await import("@/auth/functions");
      await handleGoogleCallback({ data: { code: search.code, state: search.state } });
      throw redirect({ to: "/" });
    } catch (e: any) {
      // Re-throw redirects (from TanStack Router)
      if (e?.isRedirect) throw e;
      console.error("Google OAuth callback failed:", e);
      throw redirect({ to: "/auth" });
    }
  },
  component: () => (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground text-sm">Signing in with Google...</p>
    </div>
  ),
});
