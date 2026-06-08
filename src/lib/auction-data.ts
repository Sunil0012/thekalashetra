import lot01 from "@/assets/lot-01.jpg";
import lot02 from "@/assets/lot-02.jpg";
import lot03 from "@/assets/lot-03.jpg";
import lot04 from "@/assets/lot-04.jpg";
import lot05 from "@/assets/lot-05.jpg";
import lot06 from "@/assets/lot-06.jpg";
import lot07 from "@/assets/lot-07.jpg";
import lot08 from "@/assets/lot-08.jpg";
import lot09 from "@/assets/lot-09.jpg";

export type Category = "Painting" | "Drawing" | "Sculpture" | "Photography" | "Print";

export type Lot = {
  id: string;
  image: string;
  artist: string;
  artistBio: string;
  title: string;
  year: number;
  startingBid: number;
  bid: number;
  bidCount: number;
  endsInMin: number;
  category: Category;
  listedAt: number;
  medium: string;
  dimensions: string;
  provenance: string;
  description: string;
};

export const LOTS: Lot[] = [
  {
    id: "A41C2D", image: lot01, artist: "Noor Vasquez",
    artistBio: "Mexican-Lebanese painter based in Oaxaca. Works in oil and earth pigments.",
    title: "Combustion No. 3", year: 2024, startingBid: 2800, bid: 4280, bidCount: 14,
    endsInMin: 1 * 1440 + 9 * 60 + 53, category: "Painting", listedAt: 9,
    medium: "Oil and pigment on linen",
    dimensions: "120 × 120 cm",
    provenance: "Acquired directly from the artist's studio, 2024.",
    description: "Part of a five-work series exploring heat, rupture, and the moment material gives way to gesture.",
  },
  {
    id: "73B19E", image: lot02, artist: "Helene Marchetti",
    artistBio: "Lyon-based draftswoman known for restrained botanical studies.",
    title: "Three Poppies", year: 2023, startingBid: 700, bid: 1100, bidCount: 6,
    endsInMin: 1 * 1440 + 21 * 60 + 12, category: "Drawing", listedAt: 7,
    medium: "Graphite on Arches paper",
    dimensions: "56 × 76 cm",
    provenance: "Private collection, Geneva.",
    description: "A quiet study from Marchetti's ongoing 'Wildflowers, Slowed' suite.",
  },
  {
    id: "5F0A88", image: lot03, artist: "Tomás Aldana",
    artistBio: "Argentine sculptor working primarily in patinated bronze.",
    title: "Vessel for Wind", year: 2024, startingBid: 6500, bid: 9650, bidCount: 21,
    endsInMin: 2 * 1440 + 9 * 60 + 5, category: "Sculpture", listedAt: 4,
    medium: "Patinated bronze, edition of 6",
    dimensions: "182 × 64 × 48 cm",
    provenance: "From the artist, with foundry certificate.",
    description: "A standing form that reads as both flame and figure, cast at the Vega foundry in Buenos Aires.",
  },
  {
    id: "C2DE10", image: lot04, artist: "Yuki Harada",
    artistBio: "Tokyo-trained photographer working in long-exposure silver gelatin.",
    title: "Watcher in Fog", year: 2022, startingBid: 2200, bid: 3400, bidCount: 9,
    endsInMin: 2 * 1440 + 21 * 60 + 40, category: "Photography", listedAt: 6,
    medium: "Silver gelatin print, edition 3 of 12",
    dimensions: "60 × 60 cm",
    provenance: "Printed by the artist; accompanied by a signed certificate.",
    description: "From the series 'Hokkaido Mornings,' shot near Lake Akan in winter.",
  },
  {
    id: "9B44A7", image: lot05, artist: "Adaeze Okoro",
    artistBio: "Nigerian color field painter based in Lagos and London.",
    title: "Horizon, Late", year: 2025, startingBid: 9000, bid: 12800, bidCount: 18,
    endsInMin: 3 * 1440 + 4 * 60, category: "Painting", listedAt: 12,
    medium: "Acrylic and pigment stick on canvas",
    dimensions: "200 × 200 cm",
    provenance: "Acquired from Okoro's 2025 solo exhibition, 'Slow Air.'",
    description: "A single horizon line of pale gold suspended in saturated ultramarine.",
  },
  {
    id: "1E77F3", image: lot06, artist: "Ren Kobayashi",
    artistBio: "Kyoto-based printmaker continuing the moku-hanga tradition.",
    title: "Tidefall, Indigo", year: 2024, startingBid: 1800, bid: 2750, bidCount: 11,
    endsInMin: 4 * 1440 + 2 * 60, category: "Print", listedAt: 2,
    medium: "Woodblock print on kozo paper, edition 8 of 30",
    dimensions: "46 × 62 cm",
    provenance: "From the artist, hand-pulled at the Kobayashi atelier.",
    description: "A contemporary reading of the cresting-wave motif, in deep indigo and cream.",
  },
  {
    id: "6A21B5", image: lot07, artist: "Salim Farouk",
    artistBio: "Cairo-born mixed media artist working between Marseille and Alexandria.",
    title: "Letters to a Bird", year: 2023, startingBid: 3600, bid: 5400, bidCount: 13,
    endsInMin: 5 * 1440 + 11 * 60, category: "Painting", listedAt: 5,
    medium: "Collage, gold leaf, and acrylic on linen",
    dimensions: "90 × 90 cm",
    provenance: "Acquired from Galerie Reisin, Marseille, 2023.",
    description: "A layered surface of torn paper and gilding, anchored by a single small bird.",
  },
  {
    id: "30FF8C", image: lot08, artist: "Iona Berglund",
    artistBio: "Swedish ceramicist known for high-fire stoneware with poured celadon glazes.",
    title: "Drip Study, Celadon", year: 2024, startingBid: 1400, bid: 2100, bidCount: 7,
    endsInMin: 6 * 1440 + 6 * 60, category: "Sculpture", listedAt: 10,
    medium: "Wheel-thrown stoneware, celadon glaze",
    dimensions: "38 × 26 × 26 cm",
    provenance: "From the artist's studio in Gotland.",
    description: "A generous, full-bodied vessel that lets the glaze do the speaking.",
  },
  {
    id: "B8C402", image: lot09, artist: "Pietro Casal",
    artistBio: "Roman draftsman whose ink studies trace overlooked classical sites.",
    title: "Ruins at Ostia", year: 2022, startingBid: 1200, bid: 1850, bidCount: 8,
    endsInMin: 7 * 1440 + 1 * 60, category: "Drawing", listedAt: 3,
    medium: "Pen and ink on toned paper",
    dimensions: "42 × 56 cm",
    provenance: "Private collection, Rome.",
    description: "A patient on-site study from Casal's ongoing Ostia notebooks.",
  },
];

export const CATEGORIES: ("All Works" | Category)[] = [
  "All Works", "Painting", "Drawing", "Sculpture", "Photography", "Print",
];

export const SORTS = ["Ending Soon", "Price · High → Low", "Price · Low → High", "Newly Listed"] as const;
export type Sort = (typeof SORTS)[number];

export function formatBid(n: number) {
  return "$" + n.toLocaleString("en-US");
}

export function formatCountdown(min: number) {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

export function nextMinIncrement(current: number) {
  if (current < 1000) return 50;
  if (current < 5000) return 100;
  if (current < 20000) return 250;
  return 500;
}

// --- Local bid store (browser-only) ---
const BID_KEY = "kalashetra.bids.v1";

type BidState = Record<string, { bid: number; bidCount: number; yourMax?: number }>;

function readState(): BidState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BID_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeState(s: BidState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BID_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("kalashetra:bids"));
}

export function getLotLive(id: string): { bid: number; bidCount: number; yourMax?: number } {
  const base = LOTS.find((l) => l.id === id)!;
  const s = readState()[id];
  return s ?? { bid: base.bid, bidCount: base.bidCount };
}

export function placeMaxBid(id: string, max: number): { ok: true; newBid: number } | { ok: false; error: string } {
  const base = LOTS.find((l) => l.id === id);
  if (!base) return { ok: false, error: "Lot not found." };
  const live = getLotLive(id);
  const min = live.bid + nextMinIncrement(live.bid);
  if (max < min) return { ok: false, error: `Your max must be at least ${formatBid(min)}.` };
  const state = readState();
  state[id] = { bid: max, bidCount: live.bidCount + 1, yourMax: max };
  writeState(state);
  return { ok: true, newBid: max };
}

export function subscribeBids(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("kalashetra:bids", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kalashetra:bids", handler);
    window.removeEventListener("storage", handler);
  };
}

// --- Watchlist ---
const WATCH_KEY = "kalashetra.watch.v1";
export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); } catch { return []; }
}
export function toggleWatch(id: string) {
  const list = new Set(getWatchlist());
  if (list.has(id)) list.delete(id); else list.add(id);
  localStorage.setItem(WATCH_KEY, JSON.stringify([...list]));
  window.dispatchEvent(new Event("kalashetra:watch"));
}
export function subscribeWatch(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("kalashetra:watch", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kalashetra:watch", handler);
    window.removeEventListener("storage", handler);
  };
}

// --- Auth (mock, localStorage) ---
const AUTH_KEY = "kalashetra.auth.v1";
export type AuthUser = { name: string; email: string };
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
}
export function signIn(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("kalashetra:auth"));
}
export function signOut() {
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("kalashetra:auth"));
}
export function subscribeAuth(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("kalashetra:auth", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("kalashetra:auth", handler);
    window.removeEventListener("storage", handler);
  };
}
