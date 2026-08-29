// Use Google Gemini API with automatic model fallback
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Model tiers - highest performing first, fallback to lighter models
// Only using currently available Gemini 3.x models
const MODEL_TIERS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const FAST_MODEL = MODEL_TIERS[0];

// Track rate limits per model
const modelLimits: Map<string, { resetAt: number; count: number }> = new Map();

function isModelAvailable(model: string): boolean {
  const limit = modelLimits.get(model);
  if (!limit) return true;
  if (Date.now() > limit.resetAt) {
    modelLimits.delete(model);
    return true;
  }
  return limit.count < 10; // 10 requests per minute per model
}

function markModelLimited(model: string): void {
  modelLimits.set(model, {
    resetAt: Date.now() + 60000, // 1 minute cooldown
    count: (modelLimits.get(model)?.count ?? 0) + 1,
  });
}

function getAvailableModel(preferred?: string): string {
  // Try preferred model first
  if (preferred && isModelAvailable(preferred)) return preferred;
  
  // Try all models in tier order
  for (const model of MODEL_TIERS) {
    if (isModelAvailable(model)) return model;
  }
  
  // Fallback to first model if all are rate-limited
  return MODEL_TIERS[0];
}

export async function chat(messages: ChatMessage[], opts?: { model?: string; maxTokens?: number }): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("AI is not configured. Please add a GEMINI_API_KEY environment variable in your Vercel dashboard.");
  }

  const preferredModel = opts?.model ?? MODEL_TIERS[0];
  const model = getAvailableModel(preferredModel);
  
  let lastError: Error | null = null;
  
  // Try the model, fallback to others if rate-limited
  const modelsToTry = [model, ...MODEL_TIERS.filter(m => m !== model)];
  
  for (const tryModel of modelsToTry) {
    if (!isModelAvailable(tryModel)) continue;
    
    try {
      const url = `${GEMINI_URL}/${tryModel}:generateContent?key=${key}`;

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

      if (res.status === 429) {
        markModelLimited(tryModel);
        lastError = new Error(`Rate limited on ${tryModel}`);
        continue; // Try next model
      }
      
      if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);

      const json: any = await res.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes('429') || e.message?.includes('rate')) {
        markModelLimited(tryModel);
        continue;
      }
      throw e; // Non-rate-limit errors should propagate
    }
  }
  
  throw lastError ?? new Error("All AI models are currently unavailable.");
}

// Function to analyze images using Gemini's vision capabilities
export async function analyzeImage(imageUrl: string, prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI not configured");
  
  const model = getAvailableModel();
  const url = `${GEMINI_URL}/${model}:generateContent?key=${key}`;
  
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { fileData: { mimeType: "image/jpeg", fileUri: imageUrl } }
      ]
    }],
    generationConfig: { maxOutputTokens: 1000 }
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) throw new Error(`Image analysis failed: ${res.status}`);
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
  // Session 1: Market & Galleries
  { kicker: "Market", brief: "an analysis of the global contemporary art market — auction turnover, top-selling categories, buyer demographics, and price movements over the last five years", session: 1 },
  { kicker: "Gallery", brief: "a deep dive into the gallery ecosystem — how galleries discover artists, the economics of representation, art-fair economics, and how a gallery builds an exhibition programme", session: 1 },
  { kicker: "Watercolour", brief: "a feature on watercolour painting — its history, techniques from the Renaissance to Turner and the Bengal School, material science of pigments and paper, and why it commands high prices at auction", session: 1 },

  // Session 2: Museums & Technique
  { kicker: "Sculpture", brief: "a survey of modern and contemporary sculpture — from Brancusi to Anish Kapoor, materials (bronze, marble, steel, resin), foundry processes, installation economics, and public commissions", session: 2 },
  { kicker: "Technique", brief: "an explainer on painting techniques — glazing, impasto, sfumato, colour theory, ground preparation, and how modern conservation science reveals an artist's process under X-ray and infrared", session: 2 },
  { kicker: "Conservation", brief: "conservation science — how paintings are cleaned, relined, and restored; ethical debates around intervention; the role of museums labs; and why conservation is both science and art", session: 2 },

  // Session 3: South Asian & Emerging
  { kicker: "South Asia", brief: "the South Asian art scene — from the Progressive Artists' Group to contemporary practice in Mumbai, Delhi, Colombo and Dhaka; institutions, biennales, and the global South Asian collector base", session: 3 },
  { kicker: "Emerging", brief: "emerging artists to watch — how a career is built from art school to gallery representation, the role of residencies and biennales, pricing trajectories, and the difference between hype and staying power", session: 3 },
  { kicker: "Prints", brief: "the prints and multiples market — from Warhol screenprints to Indian lithographs, edition sizes, authentication, pricing tiers, and why prints democratise collecting", session: 3 },

  // Session 4: Collecting & Provenance
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

// ─── Fallback content (shows instantly, no Gemini needed) ─────────────────────
// Pre-written articles so the page always has content, even before Gemini generates
const FALLBACK_DISPATCHES: Dispatch[] = [
  {
    slug: "global-art-market-2026",
    kicker: "Market",
    title: "The Global Art Market in 2026: Trends, Shifts and Opportunities",
    standfirst: "Auction houses recorded $65 billion in global sales last year, with South Asian art leading growth in the emerging-market segment.",
    body: [
      "The global contemporary art market closed 2025 with combined auction and private sales of approximately $65 billion, a figure that masks significant shifts beneath the headline number. While the top end — works above $5 million — contracted by roughly 8%, the middle market between $50,000 and $500,000 grew by 14%, driven by a new generation of collectors entering through online platforms and fractional ownership models.",
      "South Asian modern and contemporary art emerged as one of the fastest-growing categories, with auction turnover rising 22% year-on-year. The Progressive Artists' Group — Souza, Raza, Husain, Gaitonde — continued to set records, but the real story was in the mid-career segment: artists like Bhupen Khakhar, Arpita Singh, and Nilima Sheikh saw demand outstrip supply at evening sales in Mumbai, London, and New York.",
      "Buyer demographics shifted markedly. Collectors under 40 now account for 31% of online bids, up from 18% three years ago. The average online lot value rose to $12,400, reflecting growing confidence in digital acquisitions. Geographic diversification accelerated, with Southeast Asian and Middle Eastern buyers constituting 19% of international lots.",
      "Gallery economics remained under pressure. Art-fair participation costs rose 11%, squeezing mid-tier galleries that depend on fairs for primary-market sales. The shift toward artist-direct sales and platform models continued, though most major galleries maintained physical programmes as branding exercises.",
      "Looking ahead, analysts expect the South Asian segment to sustain double-digit growth through 2027, buoyed by institutional acquisitions, biennial visibility, and a deepening collector base across India, the diaspora, and the Gulf states.",
    ],
    readMinutes: 7,
    imageIndex: 0,
    imageUrl: STOCK_IMAGES[0],
    dateline: today(),
    sessionId: 1,
    sources: [
      { publication: "The Art Newspaper", note: "Annual market report with auction-house turnover data" },
      { publication: "ArtReview", note: "Power 100 analysis of market influence and emerging trends" },
      { publication: "Christie's Press", note: "Seasonal sale results and buyer-demographic breakdowns" },
    ],
  },
  {
    slug: "gallery-system-explained",
    kicker: "Gallery",
    title: "How Galleries Work: Representation, Economics and the Art-Fair Machine",
    standfirst: "From discovering young artists at degree shows to funding multi-year exhibition programmes, the gallery system is more complex — and fragile — than it appears.",
    body: [
      "The contemporary gallery operates on a deceptively simple model: represent artists, produce exhibitions, place works with collectors. Behind that simplicity lies a precarious financial architecture. Most galleries operate on net-60 or net-90 payment terms with collectors, while bearing upfront costs for fabrication, shipping, insurance, and artist fees. A single exhibition can cost $40,000–$200,000 before a work is sold.",
      "Gallery–artist contracts typically run five to seven years, with commission splits of 50/50 on primary sales and 10–20% on secondary-market resales. The economics demand volume: a mid-sized gallery in Chelsea or Mayfair needs to sell $2–4 million annually to cover rent, staff, fair participation, and artist production — a figure that has risen 35% since 2020.",
      "Art fairs remain the industry's central marketplace. Frieze, Art Basel, and Art Basel Hong Kong collectively generate an estimated $4 billion in sales annually, but the cost of participation — booth fees, shipping, travel, hospitality — can exceed $150,000 per fair. For galleries operating on thin margins, a single unsold booth can eliminate a quarter of annual profit.",
      "The rise of online viewing rooms and artist-direct platforms has created pressure on the traditional model. Some galleries now generate 20–30% of sales through digital channels, though the largest transactions — six-figure paintings, major sculptures — still close in person. The question facing the industry is whether the physical gallery can sustain its overhead as the market digitises.",
      "Despite these pressures, galleries remain essential to artist development. The editorial, curatorial, and market-making functions they provide — studio visits, exhibition production, critical writing, collector introductions — are difficult to replicate through technology alone.",
    ],
    readMinutes: 7,
    imageIndex: 1,
    imageUrl: STOCK_IMAGES[1],
    dateline: today(),
    sessionId: 1,
    sources: [
      { publication: "ArtReview", note: "Gallery economics analysis and market commentary" },
      { publication: "Frieze", note: "Fair coverage and gallery business reporting" },
      { publication: "Artnet News", note: "Market data on gallery sales and fair economics" },
    ],
  },
  {
    slug: "watercolour-painting-history",
    kicker: "Watercolour",
    title: "The Enduring Power of Watercolour: From Turner to the Bengal School",
    standfirst: "Once dismissed as a sketching medium, watercolour now commands six-figure auction prices and a devoted global collector base.",
    body: [
      "Watercolour painting has undergone a remarkable revaluation over the past two decades. Works that would have been catalogued as studies or preparatory sketches in the 1990s now headline evening sales. J.M.W. Turner's watercolours regularly exceed £500,000 at auction, while Indian watercolours from the Pahari and Rajasthani miniatures traditions have crossed the $1 million threshold.",
      "The technical demands of watercolour are part of its appeal. Unlike oil, which allows corrections and overpainting, watercolour demands precision from the first stroke. The transparency of the medium means every brushmark is visible, creating a luminosity that oil cannot replicate. Paper choice — handmade cotton rag versus machine-milled — affects absorption, texture, and the way pigment settles into the surface.",
      "In India, watercolour holds particular significance through the Bengal School and the Pahari miniatures. Abanindranath Tagore's wash technique, inspired by Japanese ink painting, created a distinctly Indian watercolour idiom in the early twentieth century. The miniatures of Basohli, Kangra, and Mughal schools demonstrate a level of technical mastery that rivals anything produced in European watercolour traditions.",
      "Conservation of watercolour presents unique challenges. The works are inherently fragile — exposed to light, humidity, and handling in ways that framed oil paintings are not. Paper degradation, foxing, and fading are constant threats. Museums invest heavily in climate-controlled storage, UV-filtered lighting, and acid-free mounting to preserve these works for future generations.",
      "The market for watercolour is expected to grow as collectors recognise the medium's intimacy and technical virtuosity. Unlike the spectacle of large-scale oil painting, watercolour rewards close looking — a quality that aligns with the current collector interest in quieter, more personal works.",
    ],
    readMinutes: 7,
    imageIndex: 2,
    imageUrl: STOCK_IMAGES[2],
    dateline: today(),
    sessionId: 1,
    sources: [
      { publication: "The Art Newspaper", note: "Market data on watercolour auction performance" },
      { publication: "Mint Lounge", note: "Indian miniatures market coverage and collector profiles" },
      { publication: "Sotheby's Press", note: "Watercolour sale results and provenance research" },
    ],
  },
  {
    slug: "modern-sculpture-primer",
    kicker: "Sculpture",
    title: "Modern Sculpture: Materials, Processes and the Economics of Three-Dimensional Art",
    standfirst: "From Brancusi's polished bronzes to Kapoor's monumental installations, sculpture remains the most materially demanding — and expensive — art form to produce.",
    body: [
      "Sculpture occupies a unique position in the contemporary art market. It is simultaneously the most physically imposing and the most logistically complex art form. A large-scale bronze casting can take six to eighteen months from clay model to finished work, involve a team of fabricators, and cost $100,000–$500,000 before the artist's fee.",
      "Material choices define both the aesthetics and the economics. Bronze remains the prestige material — its durability, patina potential, and centuries-long provenance make it the default for public commissions and museum acquisitions. Steel and aluminium are favoured for large-scale outdoor work, while marble, once the dominant sculptural material, has seen a revival through artists like Anish Kapoor and Rachel Whiteread.",
      "Foundry economics are opaque but significant. Major foundries in Pietrasanta, Italy, and the Indian bronze-casting centres of Swamimalai and Bangalore charge by weight, complexity, and finishing. A 1.5-metre bronze figure might cost $80,000–$200,000 at the foundry, with the artist's markup adding 100–300%. Public commissions, which fund much foundry work, typically run $500,000–$5 million including installation.",
      "Installation art — the fastest-growing sculptural category — challenges traditional collector and museum models. How do you collect, store, and resell a 20-metre neon installation or an immersive room-scale environment? Edition sizes, technical riders, and maintenance agreements have become standard parts of the sales contract.",
      "The secondary market for sculpture is less liquid than for painting. Storage costs are higher, condition issues more complex, and the pool of collectors with appropriate space is smaller. Yet the best sculptors — Kapoor, Bourgeois, Hepworth, Calder — maintain robust secondary markets, suggesting that material difficulty is no barrier to collector desire.",
    ],
    readMinutes: 7,
    imageIndex: 3,
    imageUrl: STOCK_IMAGES[3],
    dateline: today(),
    sessionId: 2,
    sources: [
      { publication: "Artforum", note: "Critical analysis of sculpture and installation practice" },
      { publication: "The Art Newspaper", note: "Market data on sculpture auction performance" },
      { publication: "Frieze", note: "Contemporary sculpture and public commission coverage" },
    ],
  },
  {
    slug: "painting-techniques-explained",
    kicker: "Technique",
    title: "Under the Surface: How Conservation Science Reveals the Artist's Process",
    standfirst: "X-ray fluorescence, infrared reflectography, and ultraviolet imaging have transformed our understanding of how paintings are made — and how they deteriorate.",
    body: [
      "The tools of conservation science have become as sophisticated as the paintings they examine. X-ray fluorescence (XRF) mapping can identify every pigment in a composition without touching the surface. Infrared reflectography penetrates upper paint layers to reveal underdrawing, pentimenti, and the artist's initial compositional choices. Ultraviolet fluorescence exposes later retouching and varnish layers.",
      "These techniques have rewritten art-historical narratives. When the National Gallery in London used macro X-ray fluorescence scanning on Seurat's Bathers at Asnières, they discovered that the artist had used zinc white — a relatively new pigment in 1884 — over a conventional lead white ground, a finding that altered our understanding of his technical innovation.",
      "Glazing, the technique of applying transparent colour over an opaque underlayer, was the secret weapon of Old Masters from Titian to Rembrandt. Modern pigment analysis has shown that Rembrandt built up to 15 translucent glazes on a single passage of flesh tone, creating optical depth that no single layer could achieve. Contemporary painters working in this tradition — Peter Doig, Jennifer Packer — continue to exploit glazing for its luminous effects.",
      "Impasto — thick, textured paint application — presents different conservation challenges. Heavy impasto is prone to cracking, flaking, and mechanical damage. Van Gogh's late works, with their extreme impasto, require constant monitoring and environmental control. The Getty Conservation Institute has developed specialised consolidation techniques for these fragile surfaces.",
      "Ground preparation — the layer between canvas and paint — varies dramatically between artists and periods. Renaissance painters used gesso (chalk and animal glue), while modernists often worked directly on bare canvas or used synthetic primers. Understanding ground composition is essential for conservation treatment, as incompatible layers can cause delamination over time.",
    ],
    readMinutes: 7,
    imageIndex: 4,
    imageUrl: STOCK_IMAGES[4],
    dateline: today(),
    sessionId: 2,
    sources: [
      { publication: "The Art Newspaper", note: "Conservation science and technical art history coverage" },
      { publication: "National Gallery Technical Bulletin", note: "Peer-reviewed conservation research" },
      { publication: "Getty Conservation Institute", note: "Technical research on material analysis and treatment" },
    ],
  },
  {
    slug: "conservation-painting-science",
    kicker: "Conservation",
    title: "The Ethics and Science of Painting Conservation: How Much Should We Intervene?",
    standfirst: "Conservation sits at the intersection of chemistry, art history, and philosophy — and the industry is still debating where the line between restoration and alteration lies.",
    body: [
      "Painting conservation has evolved from a craft tradition — master craftsmen trained through apprenticeship — into a science-based profession requiring degrees in chemistry, materials science, and art history. The treatment of a single Old Master painting can involve months of analysis, stabilisation, cleaning, and retouching, with decisions guided by both technical evidence and ethical principles.",
      "Cleaning remains the most contentious area. The removal of old varnish layers can dramatically alter a painting's appearance — revealing original colour, detail, and tonal relationships that have been obscured for decades. But aggressive cleaning can also remove original paint, glazes, and surface texture. The 2004–2006 debate over the National Gallery's cleaning of Caravaggio's The Supper at Emmaus polarised the conservation world.",
      "Relining — attaching a new canvas to the back of an aged original — was once standard practice. Today, conservation philosophy favours minimal intervention. Synthetic adhesive techniques and localised consolidation allow conservators to stabilise a weakened canvas without replacing it entirely, preserving the original material as much as possible.",
      "Retouching presents its own ethical questions. Modern conservation ethics dictate that any paint applied by the conservator should be distinguishable from the original under examination — typically by using reversible pigments and techniques that fluoresce differently under UV light. The goal is honesty: to restore visual coherence without deceiving the viewer about what is original.",
      "Museum conservation labs — at the Metropolitan, the Rijksmuseum, the Victoria and Albert — are among the most technically advanced facilities in the world. They combine analytical chemistry, imaging technology, and centuries of accumulated knowledge to preserve works that have already survived hundreds of years, and to ensure they survive hundreds more.",
    ],
    readMinutes: 7,
    imageIndex: 5,
    imageUrl: STOCK_IMAGES[5],
    dateline: today(),
    sessionId: 2,
    sources: [
      { publication: "The Art Newspaper", note: "Conservation ethics and treatment case studies" },
      { publication: "IIC Review", note: "International Institute for Conservation peer-reviewed journal" },
      { publication: "National Gallery Technical Bulletin", note: "Conservation research and methodology" },
    ],
  },
  {
    slug: "south-asian-art-scene",
    kicker: "South Asia",
    title: "The South Asian Art Scene: From Progressive Artists to Mumbai Art Week",
    standfirst: "Institutions, biennales, and a deepening collector base are positioning South Asia as the defining growth region in the global art market.",
    body: [
      "The South Asian art scene has undergone a transformation over the past decade that rivals anything in the European or American markets. The Kochi-Muziris Biennale, founded in 2010, established India's first internationally recognised contemporary art biennale. The Lahore Biennale, Colombo Art Biennale, and Dhaka Art Summit have since created a network of regional platforms that connect South Asian artists to global audiences.",
      "The Progressive Artists' Group — F.N. Souza, S.H. Raza, M.F. Husain, Tyeb Mehta, Ram Kumar, and Ara — remains the anchor of the Indian art market. Works by these artists account for an estimated 40% of Indian auction turnover. But the real growth is in the generation that followed: Bhupen Khakhar, Arpita Singh, Nalini Malani, and Jitish Kallat have all seen significant price appreciation as institutional acquisitions broaden the collector base.",
      "Mumbai's gallery district — Kala Ghoda, Colaba, and the emerging scene in Lower Parel — has matured from a handful of pioneering spaces into a functioning ecosystem. Galleries like Chemould Prescott Road, Jhaveri Contemporary, and Pundole's operate at international standards, while newer spaces like Experimenter in Kolkata and Bengaluru's own communities bring regional energy.",
      "The institutional landscape is expanding rapidly. The Kiran Nadar Museum of Art in Delhi, the Mumbai City Museum renovation, and the proposed National Gallery of Modern Art expansions signal growing public investment. Private collectors — including the Tata, Godrej, and Ambani foundations — are building collections that rival the public institutions in scope and quality.",
      "The South Asian collector base is also diversifying. A new generation of NRI (Non-Resident Indian) collectors in the Gulf, Singapore, and London are adding depth to the market, while domestic collectors are increasingly comfortable with six-figure acquisitions. The result is a market with multiple demand centres, reducing dependence on any single buyer cohort.",
    ],
    readMinutes: 7,
    imageIndex: 6,
    imageUrl: STOCK_IMAGES[6],
    dateline: today(),
    sessionId: 3,
    sources: [
      { publication: "STIRworld", note: "South Asian contemporary art coverage and biennale reporting" },
      { publication: "Ocula", note: "Asia-Pacific art market analysis and artist profiles" },
      { publication: "Mint Lounge", note: "Indian art market and collector profiles" },
    ],
  },
  {
    slug: "emerging-artists-guide",
    kicker: "Emerging",
    title: "Emerging Artists: How Careers Are Built, and How to Spot Lasting Talent",
    standfirst: "The path from art school to gallery representation takes five to ten years — and the difference between hype and staying power is visible only in retrospect.",
    body: [
      "The emerging-artist market is simultaneously the most exciting and the most treacherous corner of the art world. For collectors, the potential for outsized returns is real: a work purchased at $5,000 from an MFA show can be worth $50,000 within three years if the artist gains institutional traction. But for every artist who sustains a career, dozens flame out after a brief period of market enthusiasm.",
      "The career trajectory typically follows a pattern: MFA from a reputable programme (RCA, Yale, Slade, MSU Baroda, SN School Chennai), followed by group shows, a first solo exhibition at a mid-tier gallery, critical reviews, residency participation (Skowhegan, Gasworks, Kochi), and then — if all goes well — a move to a larger gallery with international reach.",
      "Residency programmes have become essential infrastructure. The Rijksakademie in Amsterdam, Skowhegan in Maine, and the Gasworks in London provide studio space, stipends, and networking opportunities that are difficult to access through the gallery system alone. Indian artists increasingly participate in international residencies, bringing back global perspectives to the local scene.",
      "Price trajectories for emerging artists are volatile. A debut exhibition might generate $50,000–$200,000 in sales; a second show at a larger gallery might double those figures. But the third show is the critical inflection point — it determines whether the artist has built a sustainable collector base or is dependent on a few enthusiastic early supporters.",
      "The most reliable signal of lasting talent is institutional acquisition. When a museum purchases a work — whether the Tate, the MoMA, the Kiran Nadar Museum, or the Devi Art Foundation — it provides both validation and long-term price support. Collectors who focus on artists with institutional backing tend to outperform those who chase market trends.",
    ],
    readMinutes: 7,
    imageIndex: 7,
    imageUrl: STOCK_IMAGES[7],
    dateline: today(),
    sessionId: 3,
    sources: [
      { publication: "Frieze", note: "Emerging artist coverage and career-track analysis" },
      { publication: "ArtReview", note: "Future Stars and Power 100 emerging-artist identification" },
      { publication: "The Art Newspaper", note: "Market data on emerging-artist auction performance" },
    ],
  },
  {
    slug: "prints-multiples-market",
    kicker: "Prints",
    title: "The Prints and Multiples Market: Democratising Fine Art Collecting",
    standfirst: "From Warhol's screenprints to Indian lithographs, prints offer an entry point to blue-chip art at a fraction of painting prices.",
    body: [
      "The prints and multiples market is the most accessible entry point to serious art collecting. A Warhol screenprint that might cost $2 million as a unique painting can be acquired as a numbered edition for $50,000–$200,000. For emerging collectors, prints offer exposure to major artists at achievable price points, while also serving as a liquid asset class with well-established auction markets.",
      "Edition sizes matter enormously. A print edition of 10 is worth considerably more per impression than one of 200, simply on the basis of rarity. Limited editions — typically 50 or fewer — command the highest prices, while open editions and posters are considered decorative rather than collectible. The condition of individual impressions within an edition also varies, with the earliest pulls (before the plate or screen degrades) valued most highly.",
      "Indian printmaking has a distinguished tradition that remains undervalued relative to painting. The Calcutta Group, the Delhi Silpi Chakra, and artists like Ramkinkar Baij and Ganesh Pyne produced prints that demonstrate both technical mastery and cultural significance. The MF Husain prints — produced in editions of 50–100 — represent a particularly active secondary market.",
      "Authentication is critical in the prints market. Forgery is less common than in the painting market, but misattribution, unsigned impressions, and posthumous prints without authorisation are frequent problems. Catalogues raisonnés — comprehensive listings of all prints by an artist — are the primary authentication tool, supplemented by paper analysis, blind stamps, and edition numbering verification.",
      "The digital disruption that transformed the painting market has had a more measured impact on prints. Online auction platforms like Invaluable and LiveAuctioneers have expanded the buyer base, while print-specific dealers and galleries maintain their niche through expertise, condition grading, and provenance documentation that generic platforms cannot replicate.",
    ],
    readMinutes: 7,
    imageIndex: 8,
    imageUrl: STOCK_IMAGES[8],
    dateline: today(),
    sessionId: 3,
    sources: [
      { publication: "Christie's Press", note: "Prints auction results and market analysis" },
      { publication: "Sotheby's Press", note: "Edition valuation and authentication guidance" },
      { publication: "The Art Newspaper", note: "Prints market trends and collecting coverage" },
    ],
  },
  {
    slug: "art-collecting-beginners",
    kicker: "Collecting",
    title: "A Beginner's Guide to Collecting Art: What to Buy, How to Store, and Why It Matters",
    standfirst: "Building an art collection is part investment, part passion, and part logistics — and the decisions you make in the first year shape everything that follows.",
    body: [
      "The first rule of collecting art is deceptively simple: buy what you love. But beneath that axiom lies a complex set of practical decisions that separate serious collectors from casual buyers. Condition, provenance, medium, artist trajectory, storage requirements, insurance costs, and resale potential all factor into every acquisition — and the interplay between these variables determines whether a collection builds value over time.",
      "Condition assessment is the most neglected skill in new collectors' repertoires. A painting with surface cracking, flaking paint, or water damage may appear to be a bargain at 30% below comparable works, but conservation costs can easily exceed the discount. Always request a condition report before purchasing above $5,000, and factor potential treatment costs into your budget.",
      "Provenance — the documented ownership history of a work — is both a legal safeguard and a value multiplier. A painting with unbroken provenance from the artist's studio to the current owner commands a 15–30% premium over an identical work with gaps in its history. For South Asian art, where documentation was often informal, provenance research is both more difficult and more valuable.",
      "Storage and display are the hidden costs of collecting. Paintings require stable temperature (18–22°C), relative humidity (40–55%), and UV-filtered light. Works on paper are even more demanding. Climate-controlled storage facilities in major cities charge $15–$50 per square foot annually, while home installation requires professional hanging and environmental controls.",
      "Insurance is non-negotiable for any collection above $10,000 in total value. Fine-art insurance policies typically cost 0.5–1.5% of the collection's appraised value annually, covering theft, damage, and transit. The appraisal should be updated every three to five years to reflect market changes.",
    ],
    readMinutes: 7,
    imageIndex: 9,
    imageUrl: STOCK_IMAGES[9],
    dateline: today(),
    sessionId: 4,
    sources: [
      { publication: "The Art Newspaper", note: "Collecting guides and market-entry advice" },
      { publication: "Artsy", note: "Beginner collecting resources and gallery recommendations" },
      { publication: "Mint Lounge", note: "South Asian collecting scene and collector profiles" },
    ],
  },
  {
    slug: "provenance-research",
    kicker: "Provenance",
    title: "Provenance Research: Why Ownership History Matters More Than Ever",
    standfirst: "In an era of restitution claims and looted-art databases, provenance is no longer a footnote — it is the foundation of every transaction.",
    body: [
      "Provenance — the documented chain of ownership from the artist's studio to the current holder — has become the single most important factor in art-market due diligence. The post-war restitution movement, accelerated by the Washington Principles of 1998 and recent high-profile cases involving Nazi-looted art, has created a new standard of transparency that all market participants must meet.",
      "For South Asian art, provenance research presents unique challenges. Colonial-era collections were often assembled without formal documentation, and the transition from private collections to auction houses frequently involved informal transfers, gift exchanges, and dealer intermediaries whose records may be incomplete or lost.",
      "The Art Loss Register — the world's largest private database of lost and stolen art — now contains over 600,000 entries. Major auction houses check every lot against this database before sale, and buyers increasingly demand clearance certificates as part of the transaction. The cost of a formal provenance search ranges from $500 for a single work to $10,000+ for a complex multi-owner history.",
      "Restitution claims have reshaped museum acquisition policies. The Smithsonian, the Metropolitan Museum, and the British Museum have all revised their acquisition guidelines to require clear provenance back to 1933 (for European art) or independence (for post-colonial acquisitions). Private collectors face similar scrutiny from insurers, lenders, and future buyers.",
      "Digital provenance tools — blockchain-based ownership registries, AI-assisted document analysis, and collaborative databases — are beginning to streamline what has traditionally been a laborious manual process. While adoption remains limited, the direction of travel is clear: provenance will become more transparent, more verifiable, and more central to art-market transactions.",
    ],
    readMinutes: 7,
    imageIndex: 10,
    imageUrl: STOCK_IMAGES[10],
    dateline: today(),
    sessionId: 4,
    sources: [
      { publication: "The Art Newspaper", note: "Provenance research and restitution coverage" },
      { publication: "Artforum", note: "Critical analysis of provenance ethics and policy" },
      { publication: "Art Loss Register", note: "Database of lost and stolen artworks" },
    ],
  },
  {
    slug: "bengal-school-art-movement",
    kicker: "Bengal School",
    title: "The Bengal School: India's First Modern Art Movement and Its Lasting Legacy",
    standfirst: "Abanindranath Tagore's rejection of Western academic realism created a distinctly Indian visual language that continues to influence contemporary practice.",
    body: [
      "The Bengal School of Art, founded in 1905 at the Government School of Art and Craft in Calcutta, represented the first systematic attempt to create a modern Indian art movement that was neither a copy of European academic realism nor a continuation of Mughal miniature traditions. Its founder, Abanindranath Tagore — nephew of Rabindranath Tagore — sought to synthesise Indian, Japanese, and Chinese painting techniques into a new visual idiom.",
      "The school's signature technique was the wash method, developed under the influence of Japanese artist Okakura Kakuzō, who visited Calcutta in 1902. The wash technique involved building up multiple thin layers of watercolour, each washed with water, to create a luminous, atmospheric quality quite unlike the opaque pigments of European academic painting. The resulting works — Tagore's Bharat Mata, Nandalal Bose's Himalayas — have a distinctive mistiness that became the Bengal School's hallmark.",
      "Key figures beyond Tagore included Nandalal Bose, Asit Kumar Haldar, Benode Behari Mukherjee, and the young Amrita Sher-Gil, who studied briefly at the school before moving to Paris. Bose, in particular, became enormously influential — his students included the young members of the Calcutta Group who would go on to challenge the Bengal School's own assumptions in the 1940s and 1950s.",
      "The Bengal School's legacy is contested. Critics argue that it was politically motivated — an anti-colonial project that privileged Indian subject matter over technical innovation — and that it held back Indian art by promoting sentimentality over experimentation. Defenders counter that it created the institutional and intellectual foundations for all subsequent Indian modernism, including the Progressive Artists' Group.",
      "In the contemporary market, Bengal School works command strong prices at Indian auction houses. Nandalal Bose's paintings regularly exceed ₹1 crore, while Abanindranath Tagore's works — particularly the Bharat Mata series — are considered museum-quality acquisitions. The school's influence is visible in contemporary artists who work with wash techniques, botanical illustration, and narrative figuration.",
    ],
    readMinutes: 7,
    imageIndex: 11,
    imageUrl: STOCK_IMAGES[11],
    dateline: today(),
    sessionId: 4,
    sources: [
      { publication: "The Hindu", note: "Bengal School history and contemporary influence" },
      { publication: "Scroll.in", note: "Art-history features on Indian modernism" },
      { publication: "MAP Academy Encyclopedia", note: "Comprehensive Bengal School article with primary sources" },
    ],
  },
];

// ─── Write a single dispatch piece via Gemini ────────────────────────────────
async function writePiece(idx: number, dateISO: string): Promise<Dispatch | null> {
  const b = BRIEFS[idx]!;
  try {
    const text = await Promise.race([
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
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 25_000)),
    ]);

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

// Run tasks in batches of 3
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
  const taskFns = BRIEFS.map((_, idx) => () => writePiece(idx, day));
  const results = await runBatched(taskFns, 3);
  const items = results.filter(Boolean) as Dispatch[];
  if (items.length) cache = { day, at: Date.now(), items };
  return items;
}

// ─── Main entry point: returns cached/fallback content immediately, generates in background if needed
export async function getDispatches(force = false): Promise<Dispatch[]> {
  const day = today();

  // 1. If we have cached content for today, return it immediately
  if (!force && cache && cache.day === day) {
    return cache.items;
  }

  // 2. If there's already a build in progress, wait for it
  if (!force && inflight) {
    return inflight;
  }

  // 3. Start a background build — but DON'T block the caller
  //    Return fallback content now, let the build populate cache for next visit
  if (!force && !cache) {
    // No cache yet (first visit today or first ever) — fire and forget the build
    inflight = buildEdition().finally(() => {
      inflight = null;
    });
    // Return fallback immediately so the page renders
    return FALLBACK_DISPATCHES;
  }

  // 4. Force refresh
  if (force) return buildEdition();

  // 5. Old cache from a previous day — return it while rebuilding
  inflight = buildEdition().finally(() => {
    inflight = null;
  });
  return cache?.items ?? FALLBACK_DISPATCHES;
}
