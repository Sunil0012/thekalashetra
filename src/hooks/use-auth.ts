import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRoles = async (uid: string) => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (mounted && !error) setRoles((data ?? []).map((r: any) => r.role as Role));
    };

    // Initial session — only mark loading complete AFTER roles are fetched,
    // otherwise admin gates evaluate isAdmin=false and kick admins out.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) await loadRoles(u.id);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // defer Supabase calls out of the auth callback to avoid deadlocks
        setTimeout(() => loadRoles(u.id), 0);
      } else {
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin") || roles.includes("owner");
  const isOwner = roles.includes("owner");
  return { user, roles, isAdmin, isOwner, loading };
}
