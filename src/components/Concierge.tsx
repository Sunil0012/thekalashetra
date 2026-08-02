import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askConcierge } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Welcome to Kalashetra. I can help you find lots, explain live bidding windows, buyer's premium, registration or consigning a work. What are you looking for?",
};

export function Concierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askConcierge);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res: any = await ask({ data: { messages: next.filter((m) => m !== GREETING).slice(-12) } });
      setMessages([...next, { role: "assistant", content: res.reply || res.error || "I couldn't answer that just now." }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: e?.message ?? "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ["What's open for live bidding?", "How does buyer's premium work?", "How do I consign a painting?"];

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(92vw,380px)] border border-border bg-background shadow-2xl flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="font-serif text-lg leading-none">Concierge</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Kalashetra · AI guide</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close concierge" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">✕</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[88%] text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-foreground text-background px-4 py-2.5" : "border border-border px-4 py-2.5"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Consulting the catalogue…</div>}
            {messages.length === 1 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="border border-border px-3 py-1.5 text-[11px] hover:border-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a lot, a sale, or bidding…"
              className="flex-1 bg-transparent px-2 py-2 text-[13px] focus:outline-none"
            />
            <button type="submit" disabled={busy || !input.trim()} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">Send</button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open the Kalashetra concierge"
        className="fixed bottom-5 right-5 z-50 border border-foreground bg-background px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors shadow-lg"
      >
        {open ? "Close" : "Ask Concierge"}
      </button>
    </>
  );
}
