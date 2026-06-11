export function formatBid(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function nextMinIncrement(current: number) {
  if (current < 10000) return 500;
  if (current < 50000) return 1000;
  if (current < 200000) return 2500;
  return 5000;
}

export function formatCountdown(target: string | Date | null | undefined): string {
  if (!target) return "—";
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  if (h > 0) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

// Next 23:59 IST after the given ISO timestamp
export function nextISTMidnight(fromIso: string | Date): Date {
  const from = new Date(fromIso);
  // IST = UTC+5:30
  const istOffsetMin = 330;
  const utcMs = from.getTime();
  const istNow = new Date(utcMs + istOffsetMin * 60 * 1000);
  // build 23:59 IST same day, in UTC
  const y = istNow.getUTCFullYear();
  const mo = istNow.getUTCMonth();
  const da = istNow.getUTCDate();
  // 23:59 IST = 18:29 UTC
  const due = Date.UTC(y, mo, da, 18, 29, 0, 0);
  // if already past, push to next day
  return new Date(due <= utcMs ? due + 24 * 3600 * 1000 : due);
}
