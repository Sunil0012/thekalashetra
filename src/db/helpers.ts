import { supabaseAdmin } from "./supabase-client";

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role);
}

export async function assertAdmin(userId: string): Promise<void> {
  const roles = await getUserRoles(userId);
  const ok = roles.some((r) => r === "admin" || r === "owner");
  if (!ok) throw new Error("Forbidden: admin only");
}

export async function assertOwner(userId: string): Promise<void> {
  const roles = await getUserRoles(userId);
  const ok = roles.some((r) => r === "owner");
  if (!ok) throw new Error("Only the owner can do this.");
}

export async function assertApproved(userId: string): Promise<void> {
  const roles = await getUserRoles(userId);
  if (roles.some((r) => r === "admin" || r === "owner")) return;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.account_status !== "approved") {
    throw new Error("Your account is pending admin approval.");
  }
}

export async function getProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    accountStatus: data.account_status,
  };
}
