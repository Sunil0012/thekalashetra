import { supabaseAdmin } from "@/db/supabase-client";

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountStatus: "pending" | "approved" | "suspended";
};

export type UserRole = "owner" | "admin" | "user";

export async function findOrCreateUser(googleUser: {
  id: string;
  email: string;
  name: string;
  picture: string;
}): Promise<AppUser> {
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", googleUser.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: googleUser.name, avatar_url: googleUser.picture })
      .eq("id", googleUser.id);

    return {
      id: existing.id,
      email: existing.email ?? googleUser.email,
      fullName: googleUser.name,
      avatarUrl: googleUser.picture,
      accountStatus: existing.account_status,
    };
  }

  await supabaseAdmin.from("profiles").insert({
    id: googleUser.id,
    email: googleUser.email,
    full_name: googleUser.name,
    avatar_url: googleUser.picture,
    account_status: "pending",
  });

  return {
    id: googleUser.id,
    email: googleUser.email,
    fullName: googleUser.name,
    avatarUrl: googleUser.picture,
    accountStatus: "pending",
  };
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as UserRole);
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email ?? "",
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    accountStatus: data.account_status,
  };
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("admin") || roles.includes("owner");
}
