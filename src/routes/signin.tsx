import { createFileRoute, Link, redirect } from "@tanstack/react-router";

// Backwards compat: old /signin links go to /auth
export const Route = createFileRoute("/signin")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/auth", search: search as any });
  },
  component: () => <Link to="/auth">Continue</Link>,
});
