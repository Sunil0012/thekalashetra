import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_DAYS = 7;

function secret() {
  return process.env.ACCOUNT_APPROVAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "change-this-secret";
}

export function createAccountApprovalToken(userId: string) {
  const expiresAt = Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAccountApprovalToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.userId || !data.expiresAt || Date.now() > Number(data.expiresAt)) return null;
    return { userId: String(data.userId) };
  } catch {
    return null;
  }
}

export function accountApprovalUrl(userId: string, status: "approved" | "suspended") {
  const base = process.env.SITE_URL || "http://localhost:3000";
  return `${base}/approve-account?token=${encodeURIComponent(createAccountApprovalToken(userId))}&status=${status}`;
}
