import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteFooter } from "@/components/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Search = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — Kalashetra" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const afterAuth = () => {
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/" });
  };

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) { toast.error("Google sign-in failed"); setBusy(false); return; }
    if (res.redirected) return;
    afterAuth();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        if (!name.trim()) throw new Error("Please enter your name.");
        if (pw.length < 6) throw new Error("Password must be at least 6 characters.");
        if (pw !== pw2) throw new Error("Passwords do not match.");
        if (!agreed) throw new Error("Please accept the terms.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to verify your email.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        afterAuth();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div>
              <div className="font-serif text-2xl leading-none">Kalashetra</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Fine Art Auctions</div>
            </div>
          </Link>
          <Link to="/auctions" className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
            Browse Auctions →
          </Link>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        <aside className="relative hidden lg:flex flex-col justify-end bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#3d1f12] p-12 text-background overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(232,120,73,0.4), transparent 50%), radial-gradient(circle at 80% 70%, rgba(184,80,40,0.3), transparent 50%)" }} />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">Curated · Live · Worldwide</div>
            <h2 className="mt-6 font-serif text-5xl leading-tight">
              Bid on <span className="italic font-light">fine art</span><br />from anywhere.
            </h2>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed opacity-80">
              Sign in to bid, save lots to your watchlist, consign your own works, and request access to our administrative tools.
            </p>
          </div>
        </aside>

        <section className="flex items-center justify-center px-6 py-16 md:py-24">
          <div className="w-full max-w-md">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {mode === "signin" ? "· Returning Collector" : "· Open an Account"}
            </div>
            <h1 className="mt-6 font-serif text-5xl md:text-6xl tracking-tight">
              {mode === "signin" ? <>Welcome <span className="italic">back.</span></> : <>Join <span className="italic">Kalashetra.</span></>}
            </h1>

            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="mt-10 w-full border border-border py-4 text-[12px] font-medium uppercase tracking-[0.22em] hover:border-foreground transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">or use email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "register" && <Field label="Full name" value={name} onChange={setName} required />}
              <Field label="Email address" type="email" value={email} onChange={setEmail} required />
              <Field label="Password" type="password" value={pw} onChange={setPw} required placeholder="••••••••" />
              {mode === "register" && <Field label="Confirm password" type="password" value={pw2} onChange={setPw2} required placeholder="••••••••" />}
              {mode === "register" && (
                <label className="flex items-start gap-3 pt-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-foreground" />
                  <span className="text-[12px] text-muted-foreground leading-relaxed">
                    I agree to Kalashetra's Terms of Sale and Privacy Policy, and confirm I am over 18.
                  </span>
                </label>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-foreground text-background py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-10 text-center text-[13px] text-muted-foreground">
              {mode === "signin" ? "New to Kalashetra?" : "Already a collector?"}{" "}
              <button onClick={() => setMode(mode === "signin" ? "register" : "signin")} className="text-foreground underline underline-offset-4 hover:opacity-70">
                {mode === "signin" ? "Open an account" : "Sign in"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border-b border-border bg-transparent px-0 py-3 text-[15px] focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
  );
}
