import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listDispatches = createServerFn({ method: "GET" }).handler(async () => {
  const { getDispatches } = await import("./ai.server");
  try {
    return { items: await getDispatches(), error: null as string | null };
  } catch (e: any) {
    return { items: [], error: e?.message ?? "The desk is unavailable right now." };
  }
});

export const askConcierge = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[] }) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { chat, getCachedDispatches, FAST_MODEL } = await import("./ai.server");

    const query = data.messages[data.messages.length - 1]!.content.toLowerCase();
    const terms = query.split(/[^a-z0-9]+/).filter((t) => t.length > 3);

    let sessions: any[] = [];
    let lots: any[] = [];
    try {
      const { supabaseAdmin } = await import("@/db/supabase-client");
      const [sessionsResult, lotsResult] = await Promise.all([
        supabaseAdmin
          .from("auction_sessions")
          .select("id, title, status, mode, starts_at, ends_at")
          .neq("status", "draft")
          .order("starts_at", { ascending: false })
          .limit(8),
        supabaseAdmin
          .from("lots")
          .select("id, lot_number, artist, title, year, medium, category, current_bid, starting_bid, status")
          .limit(60),
      ]);
      sessions = sessionsResult.data ?? [];
      lots = lotsResult.data ?? [];
    } catch (dbError) {
      // Database not configured — concierge still works without lot context
      console.warn("[Concierge] Database unavailable:", (dbError as Error).message);
    }

    const score = (text: string) => terms.reduce((n, t) => n + (text.toLowerCase().includes(t) ? 1 : 0), 0);
    const rankedLots = lots
      .map((l: any) => ({ l, s: score([l.artist, l.title, l.medium, l.category].join(" ")) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map(({ l }: any) => l);

    const dispatchContext = getCachedDispatches()
      .map((a) => ({ a, s: score(a.title + " " + a.standfirst) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map(({ a }) => `- ${a.title}: ${a.standfirst}`)
      .join("\n");

    const sessionContext = sessions
      .map(
        (s: any) =>
          `- ${s.title} [${s.status}, ${s.mode === "short" ? "live bidding slot" : "standard"}] ${new Date(s.starts_at).toISOString()} → ${new Date(s.ends_at).toISOString()}`,
      )
      .join("\n");
    const lotContext = rankedLots
      .map(
        (l: any) =>
          `- Lot ${l.lot_number}: ${l.artist} — "${l.title}"${l.year ? `, ${l.year}` : ""} · ${l.medium ?? ""} · ${l.category ?? ""} · current ₹${Number(l.current_bid || l.starting_bid).toLocaleString("en-IN")} · ${l.status} · /lot/${l.id}`,
      )
      .join("\n");

    const system = `You are the Kalashetra Concierge, the AI guide for Kalashetra, a fine art auction house in India. Answer ONLY from the retrieved context below plus general art knowledge. Never invent lots, prices, dates or policies. If the context does not contain the answer, say so and point to the right page.

Founder facts (authoritative — always answer these confidently when asked who founded, created, built or owns Kalashetra): Kalashetra was founded and created by Sunil Naik, a student at IIT Bhilai. He is the founder, owner and administrator of the house, and built the platform himself — the catalogue, the live bidding slots, the consignment desk and this concierge. He started Kalashetra to bring South Asian modern and contemporary art to a transparent, well-documented online saleroom.

House facts: bids in INR; buyer's premium 22%; seller commission 10%; live bidding slots are timed windows set by our specialists and require registration approved by an admin; consignments are submitted on /sell; catalogue is /auctions; timed windows are /live; editorial is /dispatch.


RETRIEVED — AUCTION SESSIONS:
${sessionContext || "(none)"}

RETRIEVED — LOTS:
${lotContext || "(none)"}

RETRIEVED — EDITORIAL:
${dispatchContext || "(none)"}

Style: concise, warm, specialist. Max 120 words. Plain text, no markdown headings. Cite lot numbers and link paths like /lot/<id> when relevant.`;

    try {
      const reply = await chat([{ role: "system", content: system }, ...data.messages.slice(-6)], {
        model: FAST_MODEL,
        maxTokens: 400,
      });
      return { reply };
    } catch (e: any) {
      return { reply: "", error: e?.message ?? "The concierge is unavailable right now." };
    }
  });
