import type { CookieSerializeOptions } from "cookie-es";

const SESSION_COOKIE = "kalashetra_session";

export type SessionData = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

// Server-side session helpers (using @tanstack/react-start/server)
export async function getServerSession(): Promise<SessionData | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionData;
    if (!data.userId || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setServerSession(session: SessionData): Promise<void> {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  } as any);
}

export async function clearServerSession(): Promise<void> {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(SESSION_COOKIE, { path: "/" } as any);
}
