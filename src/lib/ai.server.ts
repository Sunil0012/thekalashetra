// Use OpenAI API directly (works on Vercel)
const GATEWAY = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const FAST_MODEL = "gpt-4o-mini";

export async function chat(messages: ChatMessage[], opts?: { model?: string; maxTokens?: number }): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Fallback: return a helpful message instead of throwing
    throw new Error("AI is not configured. Please add an OPENAI_API_KEY environment variable in your Vercel dashboard.");
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts?.model ?? MODEL,
      ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      messages,
    }),
  });
  if (res.status === 429) throw new Error("Too many requests right now — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

export type Source = { publication: string; note: string };

export type Dispatch = {
  slug: string;
  kicker: string;
  title: string;
  standfirst: string;
  body: string[];
  readMinutes: number;
  imageIndex: number;
  dateline: string;
  sources: Source[];
};

let cache: { day: string; at: number; items: Dispatch[] } | null = null;
let inflight: Promise<Dispatch[]> | null = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

export function getCachedDispatches(): Dispatch[] {
  return cache?.items ?? [];
}

const BRIEFS = [
  { kicker: "Market", brief: "an analysis of the South Asian modern & contemporary art market — pricing structures, auction cycles, private vs public sales, what drives value" },
  { kicker: "Primer", brief: "a primer on an artist, group or movement of lasting importance (e.g. Progressive Artists' Group, Bengal School, Tantra abstraction, a modern master)" },
  { kicker: "South Asia", brief: "a focus on South Asian art institutions, biennales, museums, regional practice, or contemporary studio culture" },
  { kicker: "Mechanics", brief: "an explainer on auction mechanics, provenance research, authentication, conservation, export permits, or buyer's premium economics" },
];

const SYSTEM =
  "You are the editor of an Indian fine-art auction house's editorial desk. Write factual, well-researched, evergreen art-world journalism. Never invent breaking news, quotes, sale figures, or living collectors' names. Ground everything in well-established art history, market mechanics and the South Asian modern & contemporary scene. For sources, name only real, well-known publications and institutions you are confident cover this subject (e.g. The Art Newspaper, ArtReview, Frieze, Artforum, Ocula, STIR World, The Hindu, Mint Lounge, Scroll.in, Christie's/Sotheby's press archives, museum publications) and describe in one clause what that outlet contributes to the topic — never fabricate article titles, URLs or dates. Return STRICT JSON only, no markdown fences.";

function parseJson(text: string): any {
  const raw = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

async function writePiece(idx: number, dateISO: string): Promise<Dispatch | null> {
  const b = BRIEFS[idx]!;
  const text = await chat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Write today's (${dateISO}) piece: ${b.brief}.\nReturn JSON exactly: {"kicker":"2-3 word label","title":"headline under 70 chars","standfirst":"one sentence under 160 chars","body":["p1","p2","p3","p4","p5"],"readMinutes":number,"sources":[{"publication":"real outlet or institution","note":"what it contributes, under 90 chars"}]}\nRules: 5 body paragraphs of 60-85 words each, dense with concrete detail — names, decades, movements, institutions, how the market or process actually works. 3-4 sources. Plain text, no markdown.`,
      },
    ],
    { model: FAST_MODEL, maxTokens: 1600 },
  );

  const i = parseJson(text);
  if (!i?.title) return null;
  return {
    slug: slugify(String(i.title)),
    kicker: String(i.kicker ?? b.kicker),
    title: String(i.title),
    standfirst: String(i.standfirst ?? ""),
    body: (Array.isArray(i.body) ? i.body : []).map((p: any) => String(p)),
    readMinutes: Number(i.readMinutes) || 5,
    imageIndex: idx % 4,
    dateline: dateISO,
    sources: (Array.isArray(i.sources) ? i.sources : [])
      .slice(0, 4)
      .map((s: any) => ({ publication: String(s?.publication ?? "").slice(0, 80), note: String(s?.note ?? "").slice(0, 140) }))
      .filter((s: Source) => s.publication),
  };
}

async function buildEdition(): Promise<Dispatch[]> {
  const day = today();
  const results = await Promise.all(BRIEFS.map((_, idx) => writePiece(idx, day).catch(() => null)));
  const items = results.filter(Boolean) as Dispatch[];
  if (items.length) cache = { day, at: Date.now(), items };
  return items;
}

export async function getDispatches(force = false): Promise<Dispatch[]> {
  const day = today();

  if (!force && cache) {
    if (cache.day !== day && !inflight) {
      inflight = buildEdition().finally(() => {
        inflight = null;
      });
    }
    return cache.items;
  }

  if (!force && inflight) return inflight;
  if (force) return buildEdition();

  inflight = buildEdition().finally(() => {
    inflight = null;
  });
  return inflight;
}
