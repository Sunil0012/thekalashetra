import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter } from "@/components/SiteShell";
import { signIn, LOTS } from "@/lib/auction-data";

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
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heroLot = LOTS[2]; // Vessel for Wind — sculpture

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register") {
      if (!name.trim()) return setError("Please enter your name.");
      if (pw.length < 6) return setError("Password must be at least 6 characters.");
      if (pw !== pw2) return setError("Passwords do not match.");
      if (!agreed) return setError("Please accept the terms to continue.");
    } else {
      if (!pw) return setError("Please enter your password.");
    }
    signIn({
      name: name.trim() || email.split("@")[0] || "Collector",
      email: email.trim(),
    });
    if (redirect) window.location.href = redirect;
    else navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div>
              <div className="font-serif text-2xl leading-none">Vermillion</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Fine Art Auctions
              </div>
            </div>
          </Link>
          <Link to="/auctions" className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
            Browse Auctions →
          </Link>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left — editorial visual */}
        <aside className="relative hidden lg:block bg-muted overflow-hidden">
          <img src={heroLot.image} alt={heroLot.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-background">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
              Featured Lot · {heroLot.id}
            </div>
            <h2 className="mt-6 font-serif text-4xl leading-tight">
              {heroLot.artist}
              <br />
              <span className="italic font-light">{heroLot.title}</span>
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed opacity-80">
              {heroLot.description}
            </p>
          </div>
        </aside>

        {/* Right — form */}
        <section className="flex items-center justify-center px-6 py-16 md:py-24">
          <div className="w-full max-w-md">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {mode === "signin" ? "· Returning Collector" : "· Open an Account"}
            </div>
            <h1 className="mt-6 font-serif text-5xl md:text-6xl tracking-tight">
              {mode === "signin" ? <>Welcome <span className="italic">back.</span></> : <>Join <span className="italic">Vermillion.</span></>}
            </h1>
            <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed">
              {mode === "signin"
                ? "Sign in to bid, follow lots, and access your account."
                : "Create an account to bid on lots, save works to your watchlist, and receive private-sale invitations."}
            </p>

            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              {mode === "register" && (
                <Field label="Full name" value={name} onChange={setName} required />
              )}
              <Field label="Email address" type="email" value={email} onChange={setEmail} required />
              <Field label="Password" type="password" value={pw} onChange={setPw} required placeholder="••••••••" />
              {mode === "register" && (
                <Field label="Confirm password" type="password" value={pw2} onChange={setPw2} required placeholder="••••••••" />
              )}

              {mode === "signin" && (
                <div className="text-right">
                  <button type="button" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === "register" && (
                <label className="flex items-start gap-3 pt-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-foreground" />
                  <span className="text-[12px] text-muted-foreground leading-relaxed">
                    I agree to Vermillion's Terms of Sale and Privacy Policy, and confirm I am over 18.
                  </span>
                </label>
              )}

              {error && (
                <div className="text-[12px] text-live border-l-2 border-live pl-3 py-1">{error}</div>
              )}

              <button
                type="submit"
                className="w-full bg-foreground text-background py-4 text-[11px] font-medium uppercase tracking-[0.22em] hover:opacity-90 transition-opacity"
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Social */}
            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SocialBtn label="Google" />
              <SocialBtn label="Apple" />
            </div>

            <div className="mt-10 text-center text-[13px] text-muted-foreground">
              {mode === "signin" ? "New to Vermillion?" : "Already a collector?"}{" "}
              <button
                onClick={() => { setMode(mode === "signin" ? "register" : "signin"); setError(null); }}
                className="text-foreground underline underline-offset-4 hover:opacity-70"
              >
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
        className="w-full border-b border-border bg-transparent px-0 py-3 text-[16px] font-serif focus:outline-none focus:border-foreground transition-colors"
      />
    </div>
  );
}

function SocialBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="border border-border py-3 text-[11px] font-medium uppercase tracking-[0.18em] hover:border-foreground transition-colors"
    >
      {label}
    </button>
  );
}
