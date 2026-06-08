import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "sunilnaikkethavath9@gmail.com"; // owner inbox (in-app notifications)

// =================== PUBLIC READS ===================

export const listSessions = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: "upcoming" | "live" | "ended" | "all" }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("auction_sessions").select("*").neq("status", "draft").order("starts_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getSessionBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("*").eq("slug", data.slug).maybeSingle();
    if (!session) return null;
    const { data: lots } = await supabaseAdmin.from("lots").select("*").eq("session_id", session.id).order("lot_number");
    return { session, lots: lots ?? [] };
  });

export const getLot = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lot } = await supabaseAdmin.from("lots").select("*").eq("id", data.id).maybeSingle();
    if (!lot) return null;
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("*").eq("id", lot.session_id).maybeSingle();
    const { data: bids } = await supabaseAdmin.from("bids").select("amount, created_at, user_id").eq("lot_id", data.id).order("created_at", { ascending: false }).limit(10);
    return { lot, session, bids: bids ?? [] };
  });

export const listFeaturedLots = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: sessions } = await supabaseAdmin.from("auction_sessions").select("id").in("status", ["live", "upcoming"]).order("starts_at").limit(3);
  const ids = (sessions ?? []).map((s: any) => s.id);
  if (!ids.length) return [];
  const { data: lots } = await supabaseAdmin.from("lots").select("*").in("session_id", ids).limit(8);
  return lots ?? [];
});

// =================== BIDDING ===================

export const placeBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lotId: string; amount: number }) =>
    z.object({ lotId: z.string().uuid(), amount: z.number().positive().max(100_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lot, error: le } = await supabaseAdmin.from("lots").select("*, auction_sessions!inner(status)").eq("id", data.lotId).maybeSingle();
    if (le || !lot) throw new Error("Lot not found");
    if ((lot as any).auction_sessions.status !== "live") throw new Error("Auction is not live");
    const current = Number(lot.current_bid || lot.starting_bid || 0);
    if (data.amount <= current) throw new Error(`Bid must exceed current $${current.toLocaleString()}`);
    const { error } = await supabaseAdmin.from("bids").insert({ lot_id: data.lotId, user_id: context.userId, amount: data.amount });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== CONSIGNMENTS ===================

export const submitConsignment = createServerFn({ method: "POST" })
  .inputValidator((d: any) =>
    z.object({
      artist: z.string().min(1).max(200),
      title: z.string().min(1).max(200),
      year: z.number().int().optional().nullable(),
      medium: z.string().max(200).optional(),
      dimensions: z.string().max(200).optional(),
      provenance: z.string().max(2000).optional(),
      description: z.string().max(4000).optional(),
      estimated_value: z.number().optional().nullable(),
      contact_name: z.string().min(1).max(200),
      contact_email: z.string().email().max(255),
      contact_phone: z.string().max(50).optional(),
      image_urls: z.array(z.string().url()).max(8).default([]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await tryGetUserId();
    const { data: row, error } = await supabaseAdmin.from("consignments").insert({ ...data, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "consignment",
      title: `New consignment: ${data.artist} — ${data.title}`,
      body: `From ${data.contact_name} (${data.contact_email}). Est. ${data.estimated_value ?? "—"}. Verify at /admin/consignments.`,
      link: `/admin/consignments`,
    });
    return { id: row.id };
  });

// =================== ADMIN REQUESTS ===================

export const requestAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason: string }) => z.object({ reason: z.string().min(10).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
    const { data: existing } = await supabaseAdmin.from("admin_requests").select("id").eq("user_id", context.userId).eq("status", "pending").maybeSingle();
    if (existing) throw new Error("You already have a pending admin request.");
    const { error } = await supabaseAdmin.from("admin_requests").insert({
      user_id: context.userId,
      email: profile?.email ?? "",
      full_name: profile?.full_name ?? null,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "admin_request",
      title: `New admin request from ${profile?.full_name ?? profile?.email ?? "user"}`,
      body: data.reason.slice(0, 300),
      link: `/admin/requests`,
    });
    return { ok: true };
  });

export const decideAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: meRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isOwner = (meRoles ?? []).some((r: any) => r.role === "owner");
    if (!isOwner) throw new Error("Only the owner can decide admin requests.");
    const { data: req } = await supabaseAdmin.from("admin_requests").select("*").eq("id", data.id).maybeSingle();
    if (!req) throw new Error("Request not found");
    await supabaseAdmin.from("admin_requests").update({
      status: data.approve ? "approved" : "rejected",
      decided_by: context.userId,
      decided_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (data.approve) {
      await supabaseAdmin.from("user_roles").insert({ user_id: req.user_id, role: "admin" });
    }
    return { ok: true };
  });

// =================== ADMIN: SESSIONS & LOTS ===================

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data ?? []).some((r: any) => r.role === "admin" || r.role === "owner");
  if (!ok) throw new Error("Forbidden: admin only");
}

export const adminListAllSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("auction_sessions").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminUpsertSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      slug: z.string().min(1).max(120),
      description: z.string().max(4000).optional(),
      cover_image: z.string().max(500).optional().nullable(),
      starts_at: z.string(),
      ends_at: z.string(),
      status: z.enum(["draft", "upcoming", "live", "ended"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabaseAdmin.from("auction_sessions").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("auction_sessions").insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("auction_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid().optional(),
      session_id: z.string().uuid(),
      lot_number: z.number().int().positive(),
      artist: z.string().min(1).max(200),
      title: z.string().min(1).max(200),
      year: z.number().int().optional().nullable(),
      medium: z.string().max(200).optional(),
      dimensions: z.string().max(200).optional(),
      provenance: z.string().max(2000).optional(),
      description: z.string().max(4000).optional(),
      category: z.string().max(60).optional(),
      image_url: z.string().max(500).optional().nullable(),
      starting_bid: z.number().nonnegative(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await supabaseAdmin.from("lots").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("lots").insert({ ...data, current_bid: data.starting_bid }).select().single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("lots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("admin_requests").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminListConsignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("consignments").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminDecideConsignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; notes?: string }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), notes: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("consignments").update({
      status: data.approve ? "approved" : "rejected",
      notes: data.notes ?? null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("commissions").select("*, lots(title, artist)").order("created_at", { ascending: false });
    return data ?? [];
  });

// =================== USER ACCOUNT ===================

export const recordPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lotId: string; hammer: number; paymentRef: string }) =>
    z.object({ lotId: z.string().uuid(), hammer: z.number().positive(), paymentRef: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buyersPremium = Math.round(data.hammer * 0.22);
    const commissionPct = 10;
    const commissionAmount = Math.round(data.hammer * (commissionPct / 100));
    const { data: lot } = await supabaseAdmin.from("lots").select("*").eq("id", data.lotId).maybeSingle();
    if (!lot) throw new Error("Lot not found");
    await supabaseAdmin.from("lots").update({
      status: "sold", sold_to: context.userId, sold_price: data.hammer,
    }).eq("id", data.lotId);
    await supabaseAdmin.from("commissions").insert({
      lot_id: data.lotId,
      buyer_id: context.userId,
      hammer_price: data.hammer,
      buyers_premium: buyersPremium,
      commission_pct: commissionPct,
      commission_amount: commissionAmount,
      payout_status: "pending",
      payout_ref: data.paymentRef,
    });
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "sale",
      title: `Sale: ${lot.artist} — ${lot.title} for $${data.hammer.toLocaleString()}`,
      body: `Commission owed: $${commissionAmount.toLocaleString()} → UPI 9346739056@ybl. Payment ref: ${data.paymentRef}`,
      link: `/admin/sales`,
    });
    return { ok: true, commission: commissionAmount };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bids } = await supabaseAdmin.from("bids").select("*, lots(*)").eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: cons } = await supabaseAdmin.from("consignments").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: req } = await supabaseAdmin.from("admin_requests").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { bids: bids ?? [], consignments: cons ?? [], adminRequest: req ?? null };
  });

// helper
async function tryGetUserId(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const auth = getRequestHeader("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data.user?.id ?? null;
  } catch { return null; }
}

// keep OWNER_EMAIL referenced so it isn't tree-shaken away as dead — used in docs/comments
void OWNER_EMAIL;
