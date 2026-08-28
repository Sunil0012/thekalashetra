import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getGoogleAuthUrl, exchangeGoogleCode, getGoogleUserInfo } from "./google";
import { findOrCreateUser, getUserRoles } from "./queries";
import { getServerSession, setServerSession, clearServerSession, type SessionData } from "./session";

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getGoogleAuthUrlFn = createServerFn({ method: "GET" }).handler(async () => {
  const state = generateState();
  return { url: getGoogleAuthUrl(state), state };
});

export const handleGoogleCallback = createServerFn({ method: "GET" })
  .validator(z.object({ code: z.string(), state: z.string().optional() }))
  .handler(async ({ data }) => {
    const tokens = await exchangeGoogleCode(data.code);
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    const user = await findOrCreateUser(googleUser);
    const roles = await getUserRoles(user.id);

    const session: SessionData = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    };

    await setServerSession(session);

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      accountStatus: user.accountStatus,
    };
  });

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getServerSession();
  if (!session) return null;

  const { supabaseAdmin } = await import("@/db/supabase-client");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", session.userId)
    .maybeSingle();

  if (!profile) return null;

  const { data: rolesData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", session.userId);

  return {
    userId: profile.id,
    email: profile.email ?? session.email,
    fullName: profile.full_name ?? session.fullName,
    avatarUrl: profile.avatar_url ?? session.avatarUrl,
    accountStatus: profile.account_status,
    roles: (rolesData ?? []).map((r: any) => r.role),
  };
});

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  await clearServerSession();
  return { ok: true };
});

export const queryUserRoles = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const roles = await getUserRoles(data.userId);
    return { roles };
  });

export const queryUserProfile = createServerFn({ method: "GET" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { getUserProfile } = await import("./queries");
    const profile = await getUserProfile(data.userId);
    return { profile };
  });
