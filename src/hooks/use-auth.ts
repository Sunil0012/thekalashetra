import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentSession } from "@/auth/functions";

export type Role = "owner" | "admin" | "user";
export type AccountStatus = "pending" | "approved" | "suspended";

type SessionUser = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  roles: Role[];
};

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const getSession = useServerFn(getCurrentSession);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const data = await getSession();
        if (!mounted) return;
        if (data) {
          setUser({
            userId: data.userId,
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            accountStatus: data.accountStatus as AccountStatus,
            roles: data.roles as Role[],
          });
        } else {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSession();
    return () => { mounted = false; };
  }, []);

  const isAdmin = user?.roles.includes("admin") || user?.roles.includes("owner") || false;
  const isOwner = user?.roles.includes("owner") || false;
  const isApproved = user?.accountStatus === "approved" || isAdmin;

  // Provide a compatible user object for existing code
  const compatUser = user ? {
    id: user.userId,
    email: user.email,
    user_metadata: { full_name: user.fullName },
  } : null;

  return { user: compatUser, roles: user?.roles ?? [], isAdmin, isOwner, accountStatus: user?.accountStatus ?? null, isApproved, loading };
}
