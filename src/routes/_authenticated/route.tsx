import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "@/auth/functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: { id: session.userId, email: session.email } };
  },
  component: () => <Outlet />,
});
