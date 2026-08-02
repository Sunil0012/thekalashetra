const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(messages: ChatMessage[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, reasoning_effort: "none", messages }),
  });
  if (res.status === 429) throw new Error("Too many requests right now — please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up to continue.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

export type Dispatch = {
  slug: string;
  kicker: string;
  title: string;
  standfirst: string;
  body: string[];
  readMinutes: number;
  imageIndex: number;
};

let cache: { at: number; items: Dispatch[] } | null = null;
const TTL = 6 * 60 * 60 * 1000;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

export async function getDispatches(force = false): Promise<Dispatch[]> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.items;

  const text = await chat([
    {
      role: "system",
      content:
        "You are the editor of an Indian fine-art auction house's editorial desk. You write clear, factual, evergreen art-world reporting and analysis — no invented breaking news, no fake quotes, no fabricated sale figures or named living collectors. Ground pieces in well-established art history, market mechanics, conservation, collecting practice and the South Asian modern & contemporary scene. Return STRICT JSON only.",
    },
    {
      role: "user",
      content:
        'Write 4 editorial pieces for today. Return JSON: {"items":[{"kicker":"2-3 word section label","title":"headline under 70 chars","standfirst":"one sentence, under 160 chars","body":["paragraph","paragraph","paragraph"],"readMinutes":number}]}. Mix: market analysis, an artist/movement primer, a South Asian art focus, and an auction-mechanics or provenance explainer. Each paragraph 40-60 words. No markdown, no headings inside body.',
    },
  ]);

  const raw = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  let items: any[] = [];
  try {
    items = JSON.parse(raw)?.items ?? [];
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) items = JSON.parse(m[0])?.items ?? [];
  }

  const dispatches: Dispatch[] = items.slice(0, 4).map((i: any, idx: number) => ({
    slug: slugify(String(i.title ?? `dispatch-${idx}`)),
    kicker: String(i.kicker ?? "Dispatch"),
    title: String(i.title ?? "Untitled"),
    standfirst: String(i.standfirst ?? ""),
    body: (Array.isArray(i.body) ? i.body : []).map((p: any) => String(p)),
    readMinutes: Number(i.readMinutes) || 4,
    imageIndex: idx % 4,
  }));

  if (dispatches.length) cache = { at: Date.now(), items: dispatches };
  return dispatches;
}
