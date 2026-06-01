import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/SiteShell";
import { signIn } from "@/lib/auction-data";

type Search = { redirect?: string };

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign In — Vermillion" }] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/signin" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"signin" | "register">("signin");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn({
      name: name || email.split("@")[0] || "Collector",
      email,
    });
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground text-center">
            {mode === "signin" ? "Returning collector" : "New to Vermillion"}
          </div>
          <h1 className="font-serif text-5xl tracking-tight mt-4 text-center">
            {mode === "signin" ? "Sign In" : "Register"}
          </h1>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            {mode === "register" && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:border-foreground"
                />
              </div>
            )}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full border border-border bg-background px-4 py-3 text-[14px] focus:outline-none focus:border-foreground"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background py-4 text-[11px] font-medium uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center text-[12px] text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "register" : "signin")}
              className="underline underline-offset-4 text-foreground"
            >
              {mode === "signin" ? "Register" : "Sign in"}
            </button>
          </div>

          <Link to="/" className="mt-6 block text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
            ← Back to auctions
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
