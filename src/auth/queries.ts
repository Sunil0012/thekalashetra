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

    // If no owner exists yet, make this user the owner
    const { data: owners } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "owner")
      .limit(1);

    if (!owners || owners.length === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: googleUser.id, role: "owner" });
      await supabaseAdmin.from("profiles").update({ account_status: "approved" }).eq("id", googleUser.id);
      existing.account_status = "approved";
    }

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

  // Make the first user the owner automatically
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (count === 1) {
    // First user ever — make them owner and approve
    await supabaseAdmin.from("user_roles").insert({ user_id: googleUser.id, role: "owner" });
    await supabaseAdmin.from("profiles").update({ account_status: "approved" }).eq("id", googleUser.id);
  }

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
