import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "user";
export type AccountStatus = "pending" | "approved" | "suspended";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (uid: string) => {
      const [{ data: rolesData }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("account_status").eq("id", uid).maybeSingle(),
      ]);
      if (!mounted) return;
      setRoles((rolesData ?? []).map((r: any) => r.role as Role));
      setAccountStatus((profile?.account_status as AccountStatus) ?? "pending");
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) await load(u.id);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) setTimeout(() => load(u.id), 0);
      else { setRoles([]); setAccountStatus(null); }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const isAdmin = roles.includes("admin") || roles.includes("owner");
  const isOwner = roles.includes("owner");
  const isApproved = accountStatus === "approved" || isAdmin;
  return { user, roles, isAdmin, isOwner, accountStatus, isApproved, loading };
}
