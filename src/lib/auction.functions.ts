import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth } from "@/auth/middleware";
import { supabaseAdmin } from "@/db/supabase-client";
import { assertAdmin, assertOwner, assertApproved, getProfile, getUserRoles } from "@/db/helpers";

// =================== PUBLIC READS ===================

export const listSessions = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: "upcoming" | "live" | "ended" | "all"; mode?: "short" | "long" | "all" }) => d)
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("auction_sessions").select("*").neq("status", "draft").order("starts_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.mode && data.mode !== "all") q = q.eq("mode", data.mode);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listLiveSlots = createServerFn({ method: "GET" }).handler(async () => {
  const { data: sessions, error } = await supabaseAdmin
    .from("auction_sessions").select("*").eq("mode", "short").neq("status", "draft")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = (sessions ?? []).map((s: any) => s.id);
  let lots: any[] = [];
  if (ids.length) {
    const { data: l } = await supabaseAdmin.from("lots").select("*").in("session_id", ids).order("lot_number", { ascending: true });
    lots = l ?? [];
  }
  return { sessions: sessions ?? [], lots };
});

export const getLot = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: lot } = await supabaseAdmin.from("lots").select("*").eq("id", data.id).maybeSingle();
    if (!lot) return null;
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("*").eq("id", lot.session_id).maybeSingle();
    const { data: bids } = await supabaseAdmin.from("bids").select("amount, created_at, user_id").eq("lot_id", data.id).order("created_at", { ascending: false }).limit(20);
    let bidderNames: Record<string, string> = {};
    if (session?.mode === "short" && bids?.length) {
      const ids = Array.from(new Set(bids.map((b: any) => b.user_id)));
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
      for (const p of profiles ?? []) bidderNames[p.id] = p.full_name || (p.email?.split("@")[0]) || "Bidder";
    }
    return { lot, session, bids: bids ?? [], bidderNames };
  });

export const getCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  // Fetch ALL lots regardless of session status so they always show
  const { data: lots, error: lotsError } = await supabaseAdmin
    .from("lots").select("*").order("lot_number");
  if (lotsError) throw new Error("Failed to load lots: " + lotsError.message);

  // Fetch all sessions for context (countdowns, etc.)
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("auction_sessions").select("*").order("starts_at");
  if (sessionsError) throw new Error("Failed to load sessions: " + sessionsError.message);

  const sessionsById: Record<string, any> = {};
  for (const s of sessions ?? []) sessionsById[s.id] = s;

  return { sessions: sessions ?? [], lots: lots ?? [], sessionsById };
});

// =================== BIDDING ===================

export const placeBid = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { lotId: string; amount: number }) =>
    z.object({ lotId: z.string().uuid(), amount: z.number().positive().max(1_000_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertApproved(context.userId);
    const { data: lot } = await supabaseAdmin.from("lots").select("id, session_id").eq("id", data.lotId).maybeSingle();
    if (!lot) throw new Error("Lot not found");
    const { data: session } = await supabaseAdmin.from("auction_sessions")
      .select("status, starts_at, ends_at, mode").eq("id", lot.session_id).maybeSingle();
    if (!session) throw new Error("Auction session not found");
    const now = Date.now();
    if (session.status !== "live") throw new Error("Bidding is closed for this auction.");
    if (now < new Date(session.starts_at).getTime()) throw new Error("Live bidding has not opened yet for this lot.");
    if (now > new Date(session.ends_at).getTime()) throw new Error("The live bidding window for this lot has closed.");
    const { data: reg } = await supabaseAdmin.from("auction_registrations")
      .select("status").eq("session_id", lot.session_id).eq("user_id", context.userId).maybeSingle();
    if (!reg || reg.status !== "approved") {
      throw new Error("Register for this auction and wait for admin approval before bidding.");
    }
    const { error } = await supabaseAdmin.from("bids").insert({ lot_id: data.lotId, user_id: context.userId, amount: data.amount });
    if (error) throw new Error(error.message);
    // Update lot's current bid
    await supabaseAdmin.from("lots").update({ current_bid: data.amount, bid_count: (lot as any).bid_count + 1 }).eq("id", data.lotId);
    return { ok: true };
  });

// =================== AUCTION REGISTRATIONS ===================

export const registerForSession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertApproved(context.userId);
    const { data: existing } = await supabaseAdmin.from("auction_registrations")
      .select("status").eq("session_id", data.sessionId).eq("user_id", context.userId).maybeSingle();
    if (existing) return { status: existing.status };
    const { error } = await supabaseAdmin.from("auction_registrations").insert({
      session_id: data.sessionId, user_id: context.userId, status: "pending",
    });
    if (error) throw new Error(error.message);
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("title").eq("id", data.sessionId).maybeSingle();
    const profile = await getProfile(context.userId);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "registration",
      title: `Registration request: ${profile?.fullName ?? profile?.email} for "${session?.title ?? "?"}"`,
      body: `Approve or reject at /admin/sessions`,
      link: `/admin/sessions`,
    });
    return { status: "pending" };
  });

export const getMyRegistration = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await supabaseAdmin.from("auction_registrations")
      .select("status").eq("session_id", data.sessionId).eq("user_id", context.userId).maybeSingle();
    return { status: r?.status ?? null };
  });

export const adminListRegistrations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { sessionId?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("auction_registrations").select("*, profiles(full_name, email), auction_sessions(title)").order("created_at", { ascending: false });
    if (data.sessionId) q = q.eq("session_id", data.sessionId);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminDecideRegistration = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("auction_registrations").update({
      status: data.approve ? "approved" : "rejected", decided_at: new Date().toISOString(),
    }).eq("id", data.id);
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
      image_urls: z.array(z.string()).max(8).default([]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    let userId: string | null = null;
    try {
      const { getServerSession } = await import("@/auth/session");
      const sess = await getServerSession();
      userId = sess?.userId ?? null;
    } catch {}

    const { data: row, error } = await supabaseAdmin.from("consignments").insert({ ...data, user_id: userId }).select().single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "consignment",
      title: `New consignment: ${data.artist} — ${data.title}`,
      body: `From ${data.contact_name} (${data.contact_email}). Est. ₹${(data.estimated_value ?? 0).toLocaleString("en-IN")}. Verify at /admin/consignments.`,
      link: `/admin/consignments`,
    });
    return { id: row.id };
  });

// =================== ADMIN REQUESTS ===================

export const requestAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { reason: string }) => z.object({ reason: z.string().min(10).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const profile = await getProfile(context.userId);
    const { data: existing } = await supabaseAdmin.from("admin_requests").select("id").eq("user_id", context.userId).eq("status", "pending").maybeSingle();
    if (existing) throw new Error("You already have a pending admin request.");
    const { error } = await supabaseAdmin.from("admin_requests").insert({
      user_id: context.userId, email: profile?.email ?? "", full_name: profile?.fullName ?? null, reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "admin_request",
      title: `New admin request from ${profile?.fullName ?? profile?.email ?? "user"}`,
      body: data.reason.slice(0, 300), link: `/admin/requests`,
    });
    return { ok: true };
  });

export const decideAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { data: req } = await supabaseAdmin.from("admin_requests").select("*").eq("id", data.id).maybeSingle();
    if (!req) throw new Error("Request not found");
    await supabaseAdmin.from("admin_requests").update({
      status: data.approve ? "approved" : "rejected", decided_by: context.userId, decided_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (data.approve) await supabaseAdmin.from("user_roles").insert({ user_id: req.user_id, role: "admin" });
    return { ok: true };
  });

// =================== ADMIN: SESSIONS & LOTS ===================

export const adminListAllSessions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("auction_sessions").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminUpsertSession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      slug: z.string().min(1).max(120),
      description: z.string().max(4000).optional(),
      cover_image: z.string().max(10000).optional().nullable(),
      starts_at: z.string(),
      ends_at: z.string(),
      status: z.enum(["draft", "upcoming", "live", "ended"]),
      mode: z.enum(["short", "long"]).default("long"),
      duration_minutes: z.number().int().positive().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
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
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("auction_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertLot = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
      category: z.enum(["Painting", "Drawing", "Print", "Mixed Media"]),
      image_url: z.string().max(10000).optional().nullable(),
      starting_bid: z.number().nonnegative(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
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
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("lots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("admin_requests").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminListConsignments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("consignments").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminDecideConsignment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; approve: boolean; notes?: string }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), notes: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("consignments").update({
      status: data.approve ? "approved" : "rejected", notes: data.notes ?? null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminConsignmentToLot = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { consignmentId: string; sessionId: string; startingBid: number; category: string }) =>
    z.object({
      consignmentId: z.string().uuid(),
      sessionId: z.string().uuid(),
      startingBid: z.number().nonnegative(),
      category: z.enum(["Painting", "Drawing", "Print", "Mixed Media"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: c } = await supabaseAdmin.from("consignments").select("*").eq("id", data.consignmentId).maybeSingle();
    if (!c) throw new Error("Consignment not found");
    const { data: lots } = await supabaseAdmin.from("lots").select("lot_number").eq("session_id", data.sessionId);
    const nextNo = (lots ?? []).reduce((m: number, l: any) => Math.max(m, l.lot_number), 0) + 1;
    const imageUrl = Array.isArray(c.image_urls) && c.image_urls.length ? c.image_urls[0] : null;
    const { data: row, error } = await supabaseAdmin.from("lots").insert({
      session_id: data.sessionId, lot_number: nextNo, artist: c.artist, title: c.title,
      year: c.year, medium: c.medium, dimensions: c.dimensions, provenance: c.provenance,
      description: c.description, category: data.category, image_url: imageUrl,
      starting_bid: data.startingBid, current_bid: data.startingBid,
    }).select().single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("consignments").update({ status: "approved" }).eq("id", data.consignmentId);
    return { id: row.id };
  });

export const adminListNotifications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("commissions").select("*, lots(title, artist)").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminListLots = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("*").eq("id", data.sessionId).maybeSingle();
    const { data: lots } = await supabaseAdmin.from("lots").select("*").eq("session_id", data.sessionId).order("lot_number");
    return { session, lots: lots ?? [] };
  });

// =================== ADMIN: USERS ===================

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { userId: string; grant: boolean }) => z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const targetRoles = await getUserRoles(data.userId);
    if (targetRoles.includes("owner")) throw new Error("Cannot change the owner's roles.");
    if (data.grant) {
      try { await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" }); } catch {}
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });

export const adminSetAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { userId: string; status: "approved" | "pending" | "suspended" }) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["approved", "pending", "suspended"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const targetRoles = await getUserRoles(data.userId);
    if (targetRoles.includes("owner")) throw new Error("Cannot change the owner's status.");
    const { error } = await supabaseAdmin.from("profiles").update({ account_status: data.status }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const targetRoles = await getUserRoles(data.userId);
    if (targetRoles.includes("owner")) throw new Error("Cannot remove the owner.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("bids").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });

// =================== USER ACCOUNT ===================

export const recordPurchase = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { lotId: string; hammer: number; paymentRef: string }) =>
    z.object({ lotId: z.string().uuid(), hammer: z.number().positive(), paymentRef: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: lot } = await supabaseAdmin.from("lots").select("*").eq("id", data.lotId).maybeSingle();
    if (!lot) throw new Error("Lot not found");
    if (lot.sold_to && lot.sold_to !== context.userId) throw new Error("This lot has already been sold.");
    const buyersPremium = Math.round(data.hammer * 0.22);
    const commissionPct = 10;
    const commissionAmount = Math.round(data.hammer * (commissionPct / 100));
    await supabaseAdmin.from("lots").update({
      status: "sold", sold_to: context.userId, sold_price: data.hammer, payment_due_at: null,
    }).eq("id", data.lotId);
    await supabaseAdmin.from("commissions").insert({
      lot_id: data.lotId, buyer_id: context.userId,
      hammer_price: data.hammer, buyers_premium: buyersPremium,
      commission_pct: commissionPct, commission_amount: commissionAmount,
      payout_status: "pending", payout_ref: data.paymentRef,
    });
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "sale",
      title: `Sale: ${lot.artist} — ${lot.title} for ₹${data.hammer.toLocaleString("en-IN")}`,
      body: `Commission owed: ₹${commissionAmount.toLocaleString("en-IN")} → UPI 9346739056@ybl. Payment ref: ${data.paymentRef}`,
      link: `/admin/sales`,
    });
    return { ok: true, commission: commissionAmount };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data: bids } = await supabaseAdmin.from("bids").select("*, lots(*)").eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: cons } = await supabaseAdmin.from("consignments").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: req } = await supabaseAdmin.from("admin_requests").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: profile } = await supabaseAdmin.from("profiles").select("account_status").eq("id", context.userId).maybeSingle();
    return { bids: bids ?? [], consignments: cons ?? [], adminRequest: req ?? null, accountStatus: profile?.account_status ?? "pending" };
  });

// =================== ADMIN: SESSION STATUS ===================

export const adminSetSessionStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; status: "draft" | "upcoming" | "live" | "ended" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "upcoming", "live", "ended"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: session } = await supabaseAdmin.from("auction_sessions").select("*").eq("id", data.id).maybeSingle();
    if (!session) throw new Error("Session not found");
    const patch: any = { status: data.status };
    if (data.status === "live" && session.mode === "short" && session.duration_minutes) {
      const start = new Date();
      const end = new Date(start.getTime() + Number(session.duration_minutes) * 60 * 1000);
      patch.starts_at = start.toISOString();
      patch.ends_at = end.toISOString();
    }
    const { error } = await supabaseAdmin.from("auction_sessions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "ended") {
      const now = new Date();
      const istMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 18, 29, 0));
      const { data: lots } = await supabaseAdmin.from("lots").select("id, bid_count, status").eq("session_id", data.id);
      for (const l of lots ?? []) {
        if (l.status === "active" && l.bid_count > 0) {
          const { data: top } = await supabaseAdmin.from("bids").select("user_id, amount").eq("lot_id", l.id).order("amount", { ascending: false }).limit(1).maybeSingle();
          if (top) {
            await supabaseAdmin.from("lots").update({
              status: "awaiting_payment", sold_to: top.user_id, payment_due_at: istMidnight.toISOString(),
            }).eq("id", l.id);
          }
        }
      }
    }
    return { ok: true };
  });

export const expireUnpaidLots = createServerFn({ method: "POST" }).handler(async () => {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabaseAdmin.from("lots")
    .select("id, artist, title, sold_to")
    .eq("status", "awaiting_payment").lt("payment_due_at", nowIso);
  for (const l of due ?? []) {
    await supabaseAdmin.from("lots").update({
      status: "returned", sold_to: null, sold_price: null, payment_due_at: null,
    }).eq("id", l.id);
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "lot_returned",
      title: `Unpaid: ${l.artist} — ${l.title} returned to owner`,
      body: `Buyer did not pay by 11:59 PM IST.`,
      link: `/admin`,
    });
  }
  return { freed: (due ?? []).length };
});
