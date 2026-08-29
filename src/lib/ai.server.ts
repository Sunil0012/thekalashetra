// Use Google Gemini API
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const FAST_MODEL = MODEL;

export async function chat(messages: ChatMessage[], opts?: { model?: string; maxTokens?: number }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("AI is not configured. Please add a GEMINI_API_KEY environment variable in your Vercel dashboard.");
  }

  const model = opts?.model ?? MODEL;
  const url = `${GEMINI_URL}/${model}:generateContent?key=${key}`;

  const systemMsg = messages.find((m) => m.role === "system");
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  const contents = conversationMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    generationConfig: {
      ...(opts?.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
    },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Too many requests right now — please try again in a moment.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);

  const json: any = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
  imageUrl: string;
  dateline: string;
  sources: Source[];
  sessionId: number;
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

// ─── 20 stock art / painting images (Unsplash — verified IDs) ────────────────
const STOCK_IMAGES: string[] = [
  // Session 1 — painting, gallery, watercolor, sculpture
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=1200&h=800&fit=crop",
  // Session 2 — abstract, museum, sketch, palette
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1513366433178-e40264e1b258?w=1200&h=800&fit=crop",
  // Session 3 — portrait, printmaking, ceramics, mural
  "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=1200&h=800&fit=crop",
  // Session 4 — oil tubes, easel, collage, installation
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1545996124-2dd80f169719?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1531913764164-f85c3b474500?w=1200&h=800&fit=crop",
  // Session 5 — modern art, landscape, figurative, textile
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1582561833407-b95380519868?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&h=800&fit=crop",
];

// ─── 12 daily briefs — 3 per session across 4 sessions ───────────────────────
const BRIEFS = [
  // Session 1 (kickers 0-2): Market & Galleries
  { kicker: "Market", brief: "an analysis of the global contemporary art market — auction turnover, top-selling categories, buyer demographics, and price movements over the last five years", session: 1 },
  { kicker: "Gallery", brief: "a deep dive into the gallery ecosystem — how galleries discover artists, the economics of representation, art-fair economics, and how a gallery builds an exhibition programme", session: 1 },
  { kicker: "Watercolour", brief: "a feature on watercolour painting — its history, techniques from the Renaissance to Turner and the Bengal School, material science of pigments and paper, and why it commands high prices at auction", session: 1 },

  // Session 2 (kickers 3-5): Museums & Technique
  { kicker: "Sculpture", brief: "a survey of modern and contemporary sculpture — from Brancusi to Anish Kapoor, materials (bronze, marble, steel, resin), foundry processes, installation economics, and public commissions", session: 2 },
  { kicker: "Technique", brief: "an explainer on painting techniques — glazing, impasto, sfumato, colour theory, ground preparation, and how modern conservation science reveals an artist's process under X-ray and infrared", session: 2 },
  { kicker: "Conservation", brief: "conservation science — how paintings are cleaned, relined, and restored; ethical debates around intervention; the role of museums labs; and why conservation is both science and art", session: 2 },

  // Session 3 (kickers 6-8): South Asian & Emerging
  { kicker: "South Asia", brief: "the South Asian art scene — from the Progressive Artists' Group to contemporary practice in Mumbai, Delhi, Colombo and Dhaka; institutions, biennales, and the global South Asian collector base", session: 3 },
  { kicker: "Emerging", brief: "emerging artists to watch — how a career is built from art school to gallery representation, the role of residencies and biennales, pricing trajectories, and the difference between hype and staying power", session: 3 },
  { kicker: "Prints", brief: "the prints and multiples market — from Warhol screenprints to Indian lithographs, edition sizes, authentication, pricing tiers, and why prints democratise collecting", session: 3 },

  // Session 4 (kickers 9-11): Collecting & Provenance
  { kicker: "Collecting", brief: "a beginner's guide to collecting art — how to start, what to look for, condition reports, provenance research, insurance, storage, and the psychology of building a collection", session: 4 },
  { kicker: "Provenance", brief: "provenance research in the art world — why ownership history matters, looted art databases, restitution claims, due diligence for buyers, and how auction houses verify provenance", session: 4 },
  { kicker: "Bengal School", brief: "the Bengal School of Art — Abanindranath Tagore's vision, anti-colonial aesthetics, wash technique, key works in national collections, and its lasting influence on Indian modernism", session: 4 },
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

function getStockImage(idx: number): string {
  return STOCK_IMAGES[idx % STOCK_IMAGES.length];
}

// Run an async function with a timeout
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Write a single dispatch piece
async function writePiece(idx: number, dateISO: string): Promise<Dispatch | null> {
  const b = BRIEFS[idx]!;
  try {
    const text = await withTimeout(
      chat(
        [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Write today's (${dateISO}) piece: ${b.brief}.\nReturn JSON exactly: {"kicker":"2-3 word label","title":"headline under 70 chars","standfirst":"one sentence under 160 chars","body":["p1","p2","p3","p4","p5"],"readMinutes":number,"sources":[{"publication":"real outlet or institution","note":"what it contributes, under 90 chars"}]}\nRules: 5 body paragraphs of 60-85 words each, dense with concrete detail — names, decades, movements, institutions, how the market or process actually works. 3-4 sources. Plain text, no markdown.`,
          },
        ],
        { model: FAST_MODEL, maxTokens: 1600 },
      ),
      30_000,
    );

    const i = parseJson(text);
    if (!i?.title) return null;

    const imageIndex = idx % STOCK_IMAGES.length;

    return {
      slug: slugify(String(i.title)),
      kicker: String(i.kicker ?? b.kicker),
      title: String(i.title),
      standfirst: String(i.standfirst ?? ""),
      body: (Array.isArray(i.body) ? i.body : []).map((p: any) => String(p)),
      readMinutes: Number(i.readMinutes) || 5,
      imageIndex,
      imageUrl: getStockImage(imageIndex),
      dateline: dateISO,
      sessionId: b.session,
      sources: (Array.isArray(i.sources) ? i.sources : [])
        .slice(0, 4)
        .map((s: any) => ({ publication: String(s?.publication ?? "").slice(0, 80), note: String(s?.note ?? "").slice(0, 140) }))
        .filter((s: Source) => s.publication),
    };
  } catch {
    return null;
  }
}

// Run tasks in batches of N to avoid rate limits
async function runBatched<T>(tasks: (() => Promise<T>)[], batchSize: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

async function buildEdition(): Promise<Dispatch[]> {
  const day = today();
  // Write pieces in batches of 3 to avoid Gemini rate limits
  const taskFns = BRIEFS.map((_, idx) => () => writePiece(idx, day));
  const results = await runBatched(taskFns, 3);
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
